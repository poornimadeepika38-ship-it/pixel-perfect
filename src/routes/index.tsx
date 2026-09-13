import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Gauge, ScanSearch, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

import logo from "@/assets/resume-scan-logo.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { JdModal } from "@/components/JdModal";
import { JdBreakdown } from "@/components/JdBreakdown";
import {
  ResumeUpload,
  type ApplicationFiles,
  type UploadItem,
} from "@/components/ResumeUpload";
import { Dashboard } from "@/components/Dashboard";
import { CandidateDetail } from "@/components/CandidateDetail";
import { supabase } from "@/integrations/supabase/client";
import {
  listCandidates,
  parseJobDescription,
  processResume,
  setCandidateStatus,
  type JobDescription,
  type ScoredCandidate,
} from "@/lib/screening.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resume Scan — Rank Resumes in Seconds" },
      {
        name: "description",
        content:
          "Resume Scan ranks candidates against any job description using AI skill matching and contextual fit scoring. Paste a role, drop in resumes, get a ranked shortlist.",
      },
      { property: "og:title", content: "Resume Scan — Rank Resumes in Seconds" },
      {
        property: "og:description",
        content:
          "AI resume screening: paste a job description, upload resumes, and get ranked candidates with matched and missing skills.",
      },
    ],
  }),
  component: Home,
});

type Step = "hero" | "breakdown" | "upload" | "dashboard";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function Home() {
  const [step, setStep] = useState<Step>("hero");
  const [modalOpen, setModalOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [jd, setJd] = useState<JobDescription | null>(null);
  const [candidates, setCandidates] = useState<ScoredCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(false);

  const parseJd = useServerFn(parseJobDescription);
  const analyseResume = useServerFn(processResume);
  const fetchCandidates = useServerFn(listCandidates);
  const updateStatus = useServerFn(setCandidateStatus);

  const selected = candidates.find((candidate) => candidate.id === selectedId) ?? null;

  async function handleParse(text: string) {
    setParsing(true);
    try {
      const result = await parseJd({ data: { raw_text: text } });
      setJd(result);
      setCandidates([]);
      setUploads([]);
      setModalOpen(false);
      setStep("breakdown");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setParsing(false);
    }
  }

  async function refresh(jobId: string) {
    const rows = await fetchCandidates({ data: { job_description_id: jobId } });
    setCandidates(rows);
  }

  async function handleAnalyze(applications: ApplicationFiles[]) {
    if (!jd) return;
    setRunning(true);
    setUploads(
      applications.map((app, index) => ({
        id: `${index}-${app.resume.name}`,
        name: app.cover ? `${app.resume.name} + cover letter` : app.resume.name,
        state: "queued" as const,
      })),
    );

    const upload = async (file: File) => {
      const path = `${jd.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const result = await supabase.storage.from("resumes").upload(path, file);
      if (result.error) throw new Error(result.error.message);
      return path;
    };

    for (const [index, app] of applications.entries()) {
      const id = `${index}-${app.resume.name}`;
      const patch = (state: UploadItem["state"], error?: string) =>
        setUploads((current) =>
          current.map((item) => (item.id === id ? { ...item, state, error } : item)),
        );

      try {
        patch("uploading");
        const path = await upload(app.resume);
        const coverPath = app.cover ? await upload(app.cover) : undefined;

        patch("analyzing");
        await analyseResume({
          data: {
            job_description_id: jd.id,
            file_path: path,
            file_name: app.resume.name,
            ...(coverPath
              ? { cover_letter_path: coverPath, cover_letter_file_name: app.cover!.name }
              : {}),
          },
        });
        patch("done");
      } catch (error) {
        patch("failed", errorMessage(error));
      }
    }

    await refresh(jd.id);
    setRunning(false);
  }

  async function handleStatus(candidate: ScoredCandidate, status: "shortlisted" | "rejected") {
    const next = candidate.status === status ? "analyzed" : status;
    setCandidates((current) =>
      current.map((row) => (row.id === candidate.id ? { ...row, status: next } : row)),
    );
    try {
      await updateStatus({ data: { candidate_id: candidate.id, status: next } });
      toast.success(next === "analyzed" ? "Decision cleared" : `Candidate ${next}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <main className="min-h-screen">
      <Toaster position="top-right" />

      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => setStep(jd ? "dashboard" : "hero")}
          className="flex items-center gap-2"
        >
          <img src={logo.url} alt="Resume Scan" className="h-9 w-auto" />
        </button>
        {step !== "hero" ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("hero")}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to homepage
            </Button>
            {jd ? (
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
                New job description
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {step === "hero" ? (
        <section className="hero-aurora flex min-h-[80vh] items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <ShieldCheck className="size-3.5 text-teal" aria-hidden /> ATS &amp; resume
              optimization platform
            </motion.p>

            <h1 className="mt-6 font-display text-5xl font-bold leading-tight sm:text-6xl">
              {"Rank Resumes in Seconds".split(" ").map((word, index) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 + index * 0.08, ease: "easeOut" }}
                  className={index > 1 ? "brand-gradient-text inline-block" : "inline-block"}
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.4 }}
              className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground"
            >
              Paste a job description, drop in a stack of resumes, and get a ranked shortlist with
              matched skills, gaps, and the reasoning behind every score.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.5 }}
              className="mt-8 flex flex-wrap justify-center gap-3"
            >
              <Button size="lg" onClick={() => setModalOpen(true)}>
                Paste job description
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </motion.div>

            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              {[
                { icon: ScanSearch, title: "Reads every resume", body: "PDF and DOCX parsed into structured skills and experience." },
                { icon: Gauge, title: "Two-part scoring", body: "40% keyword coverage, 60% contextual fit judged by AI." },
                { icon: ShieldCheck, title: "Decision support", body: "Shortlist or reject yourself — nothing is auto-rejected." },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.6 + index * 0.06 }}
                  className="panel-card p-5 text-left"
                >
                  <item.icon className="size-5 text-teal" aria-hidden />
                  <h2 className="mt-3 font-display text-base font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {step === "breakdown" && jd ? (
        <JdBreakdown
          jd={jd}
          onEdit={() => setModalOpen(true)}
          onContinue={() => setStep("upload")}
        />
      ) : null}

      {step === "upload" && jd ? (
        <ResumeUpload
          onAnalyze={handleAnalyze}
          running={running}
          items={uploads}
          onViewResults={() => {
            setUploads([]);
            setStep("dashboard");
          }}
        />
      ) : null}

      {step === "dashboard" && jd ? (
        <Dashboard
          jd={jd}
          candidates={candidates}
          onOpen={(candidate) => setSelectedId(candidate.id)}
          onStatus={handleStatus}
          onAddMore={() => {
            setUploads([]);
            setStep("upload");
          }}
        />
      ) : null}

      <CandidateDetail
        industryAverage={jd?.industry_average_score ?? null}
        candidate={selected}
        onClose={() => setSelectedId(null)}
        onStatus={(status) => {
          if (selected) void handleStatus(selected, status);
        }}
      />

      <JdModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleParse}
        isPending={parsing}
      />
    </main>
  );
}
