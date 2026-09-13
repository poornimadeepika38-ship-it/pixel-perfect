import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateJson } from "./ai.server";
import { extractResumeText } from "./extract.server";

export type JobDescription = {
  id: string;
  title: string;
  company: string;
  raw_text: string;
  required_skills: string[];
  preferred_skills: string[];
  min_experience_years: number | null;
  max_experience_years: number | null;
  education_requirement: string | null;
  role_summary: string | null;
  job_level: string | null;
  industry_average_score: number | null;
};

export type CandidateRow = {
  id: string;
  job_description_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  file_name: string;
  parsed_skills: string[];
  parsed_education: Array<{ degree?: string; institution?: string; year?: string | number }>;
  parsed_experience: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  total_experience_years: number | null;
  current_position: string | null;
  current_company: string | null;
  status: string;
  error_message: string | null;
  cover_letter_file_name: string | null;
  cover_letter_text: string | null;
};

export type MatchRow = {
  candidate_id: string;
  overall_score: number;
  keyword_score: number;
  semantic_score: number;
  matched_skills: string[];
  missing_skills: string[];
  bonus_skills: string[];
  ai_summary: string | null;
  strengths: string[];
  concerns: string[];
  rank: number | null;
  cover_letter_score: number | null;
  confidence: string;
  confidence_reason: string | null;
};

export type ScoredCandidate = CandidateRow & { match: MatchRow | null };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const toArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : [];

/* ----------------------------- Job description ---------------------------- */

export const parseJobDescription = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ raw_text: z.string().min(200).max(8000) }).parse(input),
  )
  .handler(async ({ data }): Promise<JobDescription> => {
    const parsed = await generateJson<Record<string, unknown>>(
      "You extract structured hiring requirements from job descriptions. Respond with JSON only, no markdown.",
      `Extract the job requirements from the text below.

Return JSON with exactly these keys:
{"title": string, "company": string, "required_skills": string[], "preferred_skills": string[], "min_experience_years": number|null, "max_experience_years": number|null, "education_requirement": string|null, "role_summary": string (2-3 sentences), "job_level": "Junior"|"Mid"|"Senior"|"Lead", "industry_average_score": number (0-100)}

"industry_average_score" is your estimate of the typical overall match score a normal applicant pool achieves for this kind of role in this industry (usually between 35 and 65).

Skills must be short canonical names (e.g. "React", "TypeScript", "PostgreSQL").

JOB DESCRIPTION:
${data.raw_text}`,
    );

    const sb = await admin();
    const { data: row, error } = await sb
      .from("job_descriptions")
      .insert({
        raw_text: data.raw_text,
        title: String(parsed["title"] ?? "Untitled role"),
        company: String(parsed["company"] ?? ""),
        required_skills: toArray(parsed["required_skills"]),
        preferred_skills: toArray(parsed["preferred_skills"]),
        min_experience_years:
          typeof parsed["min_experience_years"] === "number" ? parsed["min_experience_years"] : null,
        max_experience_years:
          typeof parsed["max_experience_years"] === "number" ? parsed["max_experience_years"] : null,
        education_requirement: parsed["education_requirement"]
          ? String(parsed["education_requirement"])
          : null,
        role_summary: parsed["role_summary"] ? String(parsed["role_summary"]) : null,
        job_level: parsed["job_level"] ? String(parsed["job_level"]) : null,
        industry_average_score:
          typeof parsed["industry_average_score"] === "number"
            ? Math.max(0, Math.min(100, Math.round(parsed["industry_average_score"])))
            : 50,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return row as unknown as JobDescription;
  });

export const getJobDescription = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<JobDescription | null> => {
    const sb = await admin();
    const { data: row } = await sb
      .from("job_descriptions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    return (row as unknown as JobDescription) ?? null;
  });

/* -------------------------------- Ranking -------------------------------- */

async function recomputeRanks(jobDescriptionId: string) {
  const sb = await admin();
  const { data: rows } = await sb
    .from("match_results")
    .select("id, overall_score")
    .eq("job_description_id", jobDescriptionId)
    .order("overall_score", { ascending: false });

  const list = (rows ?? []) as Array<{ id: string; overall_score: number }>;
  await Promise.all(
    list.map((row, index) =>
      sb.from("match_results").update({ rank: index + 1 }).eq("id", row.id),
    ),
  );
}

/* ------------------------------ Resume flow ------------------------------- */

const normalize = (skill: string) => skill.toLowerCase().replace(/[^a-z0-9+#.]/g, "");

export const processResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        job_description_id: z.string().uuid(),
        file_path: z.string().min(1),
        file_name: z.string().min(1),
        cover_letter_path: z.string().min(1).optional(),
        cover_letter_file_name: z.string().min(1).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ candidate_id: string }> => {
    const sb = await admin();

    const { data: candidate, error: insertError } = await sb
      .from("candidates")
      .insert({
        job_description_id: data.job_description_id,
        file_name: data.file_name,
        file_path: data.file_path,
        cover_letter_file_path: data.cover_letter_path ?? null,
        cover_letter_file_name: data.cover_letter_file_name ?? null,
        status: "processing",
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    const candidateId = (candidate as { id: string }).id;

    const fail = async (message: string) => {
      await sb
        .from("candidates")
        .update({ status: "failed", error_message: message })
        .eq("id", candidateId);
      throw new Error(message);
    };

    try {
      const { data: jd } = await sb
        .from("job_descriptions")
        .select("*")
        .eq("id", data.job_description_id)
        .single();
      const job = jd as unknown as JobDescription;

      const file = await sb.storage.from("resumes").download(data.file_path);
      if (file.error || !file.data) {
        return await fail("The uploaded file could not be read from storage.");
      }
      const bytes = new Uint8Array(await file.data.arrayBuffer());
      const rawText = await extractResumeText(bytes, data.file_name);

      let coverLetterText: string | null = null;
      if (data.cover_letter_path) {
        const cover = await sb.storage.from("resumes").download(data.cover_letter_path);
        if (!cover.error && cover.data) {
          try {
            coverLetterText = await extractResumeText(
              new Uint8Array(await cover.data.arrayBuffer()),
              data.cover_letter_file_name ?? data.cover_letter_path,
            );
          } catch {
            coverLetterText = null;
          }
        }
      }

      const resume = await generateJson<Record<string, unknown>>(
        "You parse resumes into structured data. Respond with JSON only, no markdown.",
        `Parse this resume.

Return JSON with exactly these keys:
{"full_name": string, "email": string|null, "phone": string|null, "current_position": string|null, "current_company": string|null, "skills": string[], "education": [{"degree": string, "institution": string, "year": string}], "experience": [{"title": string, "company": string, "duration": string, "description": string}], "total_experience_years": number}

RESUME:
${rawText}`,
      );

      const skills = toArray(resume["skills"]);

      await sb
        .from("candidates")
        .update({
          full_name: resume["full_name"] ? String(resume["full_name"]) : data.file_name,
          email: resume["email"] ? String(resume["email"]) : null,
          phone: resume["phone"] ? String(resume["phone"]) : null,
          current_position: resume["current_position"] ? String(resume["current_position"]) : null,
          current_company: resume["current_company"] ? String(resume["current_company"]) : null,
          parsed_skills: skills,
          parsed_education: (resume["education"] ?? []) as never,
          parsed_experience: (resume["experience"] ?? []) as never,
          total_experience_years:
            typeof resume["total_experience_years"] === "number"
              ? resume["total_experience_years"]
              : null,
          raw_text: rawText,
          cover_letter_text: coverLetterText,
        })
        .eq("id", candidateId);

      // Keyword score
      const required = job.required_skills ?? [];
      const candidateSet = skills.map(normalize);
      const matchedRequired = required.filter((req) =>
        candidateSet.some((s) => s === normalize(req) || s.includes(normalize(req))),
      );
      const keywordScore =
        required.length === 0 ? 0 : Math.round((matchedRequired.length / required.length) * 100);

      const analysis = await generateJson<Record<string, unknown>>(
        "You are a fair, evidence-based technical recruiter. Respond with JSON only, no markdown.",
        `Analyse this candidate against the job requirements.

Return JSON with exactly these keys:
{"matched_skills": string[], "missing_skills": string[], "bonus_skills": string[], "contextual_fit_score": number (0-100), "cover_letter_score": number (0-100) or null, "confidence": "high"|"medium"|"low", "confidence_reason": string (1 sentence), "ai_summary": string (2-3 sentences), "strengths": string[] (1-2 items), "concerns": string[] (1-2 items)}

"cover_letter_score" rates how well the cover letter argues for THIS role: relevance, specific evidence, motivation. Return null when no cover letter is provided.
"confidence" is how certain you are that the score reflects a real match: "high" when the documents give clear, specific, verifiable evidence against most requirements; "medium" when evidence is partial or vague; "low" when the documents are short, generic, hard to parse, or off-topic.

JOB: ${job.title} at ${job.company} (${job.job_level ?? "n/a"})
Required skills: ${required.join(", ")}
Preferred skills: ${(job.preferred_skills ?? []).join(", ")}
Experience required: ${job.min_experience_years ?? "?"}-${job.max_experience_years ?? "?"} years
Education: ${job.education_requirement ?? "n/a"}

CANDIDATE RESUME:
${rawText}

COVER LETTER:
${coverLetterText ?? "(none provided)"}`,
      );

      const clamp = (value: unknown) =>
        Math.max(0, Math.min(100, Math.round(Number(value ?? 0) || 0)));

      const semantic = clamp(analysis["contextual_fit_score"]);
      const hasCover = coverLetterText !== null && analysis["cover_letter_score"] !== null;
      const coverScore = hasCover ? clamp(analysis["cover_letter_score"]) : null;
      const overall =
        coverScore === null
          ? Math.round(0.4 * keywordScore + 0.6 * semantic)
          : Math.round(0.35 * keywordScore + 0.5 * semantic + 0.15 * coverScore);

      const confidenceRaw = String(analysis["confidence"] ?? "medium").toLowerCase();
      const confidence = ["high", "medium", "low"].includes(confidenceRaw)
        ? confidenceRaw
        : "medium";

      const { error: matchError } = await sb.from("match_results").insert({
        candidate_id: candidateId,
        job_description_id: data.job_description_id,
        keyword_score: keywordScore,
        semantic_score: semantic,
        cover_letter_score: coverScore,
        confidence,
        confidence_reason: analysis["confidence_reason"]
          ? String(analysis["confidence_reason"])
          : null,
        overall_score: overall,
        matched_skills: toArray(analysis["matched_skills"]),
        missing_skills: toArray(analysis["missing_skills"]),
        bonus_skills: toArray(analysis["bonus_skills"]),
        ai_summary: analysis["ai_summary"] ? String(analysis["ai_summary"]) : null,
        strengths: toArray(analysis["strengths"]),
        concerns: toArray(analysis["concerns"]),
      });
      if (matchError) throw new Error(matchError.message);

      await sb
        .from("candidates")
        .update({ status: "analyzed", analyzed_at: new Date().toISOString(), error_message: null })
        .eq("id", candidateId);

      await recomputeRanks(data.job_description_id);
      return { candidate_id: candidateId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "This resume could not be analysed.";
      await sb
        .from("candidates")
        .update({ status: "failed", error_message: message })
        .eq("id", candidateId);
      throw new Error(message);
    }
  });

export const listCandidates = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ job_description_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<ScoredCandidate[]> => {
    const sb = await admin();
    const [{ data: candidates }, { data: matches }] = await Promise.all([
      sb.from("candidates").select("*").eq("job_description_id", data.job_description_id),
      sb.from("match_results").select("*").eq("job_description_id", data.job_description_id),
    ]);

    const matchByCandidate = new Map<string, MatchRow>();
    for (const row of (matches ?? []) as unknown as MatchRow[]) {
      matchByCandidate.set(row.candidate_id, row);
    }

    return ((candidates ?? []) as unknown as CandidateRow[])
      .map((candidate) => ({
        ...candidate,
        match: matchByCandidate.get(candidate.id) ?? null,
      }))
      .sort((a, b) => (b.match?.overall_score ?? -1) - (a.match?.overall_score ?? -1));
  });

export const setCandidateStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        status: z.enum(["analyzed", "shortlisted", "rejected"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("candidates")
      .update({ status: data.status })
      .eq("id", data.candidate_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
