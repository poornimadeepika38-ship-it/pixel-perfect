import { motion } from "motion/react";
import { Check, Mail, Phone, X } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScoreRing } from "@/components/ScoreRing";
import { SkillPill } from "@/components/SkillPill";
import { ConfidenceBadge, IndustryDelta } from "@/components/MatchSignals";
import type { ScoredCandidate } from "@/lib/screening.functions";

export function CandidateDetail({
  candidate,
  onClose,
  onStatus,
  industryAverage,
}: {
  candidate: ScoredCandidate | null;
  onClose: () => void;
  onStatus: (status: "shortlisted" | "rejected") => void;
  industryAverage?: number | null;
}) {
  const match = candidate?.match ?? null;

  return (
    <Sheet open={Boolean(candidate)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl lg:max-w-5xl">
        {candidate ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">
                {candidate.full_name ?? candidate.file_name}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {[candidate.current_position, candidate.current_company].filter(Boolean).join(" · ") ||
                  "Role not detected"}
              </p>
            </SheetHeader>

            <div className="grid gap-6 px-4 pb-24 lg:grid-cols-3">
              {/* Resume */}
              <div>
                <div className="panel-card p-4">
                  <h3 className="font-display text-sm font-semibold">Contact</h3>
                  <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Mail className="size-3.5" aria-hidden /> {candidate.email ?? "Not found"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5" aria-hidden /> {candidate.phone ?? "Not found"}
                    </p>
                  </div>
                  {candidate.total_experience_years != null ? (
                    <span className="mt-3 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                      {candidate.total_experience_years} years total
                    </span>
                  ) : null}
                </div>

                <Accordion type="multiple" defaultValue={["skills"]} className="mt-3">
                  <AccordionItem value="skills">
                    <AccordionTrigger>Skills</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.parsed_skills.map((skill, i) => (
                          <SkillPill key={skill} index={i}>
                            {skill}
                          </SkillPill>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="education">
                    <AccordionTrigger>Education</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 text-sm">
                        {candidate.parsed_education.map((entry, index) => (
                          <li key={index}>
                            <p className="font-medium">{entry.degree ?? "Degree"}</p>
                            <p className="text-muted-foreground">
                              {[entry.institution, entry.year].filter(Boolean).join(" · ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="experience">
                    <AccordionTrigger>Experience</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-3 text-sm">
                        {candidate.parsed_experience.map((entry, index) => (
                          <li key={index}>
                            <p className="font-medium">
                              {entry.title ?? "Role"}
                              {entry.company ? ` · ${entry.company}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">{entry.duration}</p>
                            {entry.description ? (
                              <p className="mt-1 text-muted-foreground">{entry.description}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Skill matching */}
              <div className="space-y-4">
                <div className="panel-card p-4">
                  <h3 className="font-display text-sm font-semibold text-success">Matched</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(match?.matched_skills ?? []).map((skill, i) => (
                      <SkillPill key={skill} tone="success" index={i}>
                        {skill}
                      </SkillPill>
                    ))}
                  </div>
                </div>
                <div className="panel-card p-4">
                  <h3 className="font-display text-sm font-semibold text-warning-foreground">Missing</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(match?.missing_skills ?? []).map((skill, i) => (
                      <SkillPill key={skill} tone="warning" index={i}>
                        {skill}
                      </SkillPill>
                    ))}
                  </div>
                </div>
                <div className="panel-card p-4">
                  <h3 className="font-display text-sm font-semibold text-info">Bonus</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(match?.bonus_skills ?? []).map((skill, i) => (
                      <SkillPill key={skill} tone="info" index={i}>
                        {skill}
                      </SkillPill>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scores */}
              <div className="space-y-4">
                <motion.div
                  className="panel-card flex flex-col items-center p-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {match?.rank ? (
                    <span className="mb-2 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-navy-foreground">
                      Rank #{match.rank}
                    </span>
                  ) : null}
                  <ScoreRing value={match?.overall_score ?? 0} size={132} thickness={11} label="Overall match" />
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <IndustryDelta
                      score={match?.overall_score ?? 0}
                      average={industryAverage ?? null}
                    />
                    <ConfidenceBadge confidence={match?.confidence} />
                    {match?.confidence_reason ? (
                      <p className="text-center text-xs text-muted-foreground">
                        {match.confidence_reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-6">
                    <ScoreRing value={match?.keyword_score ?? 0} size={72} thickness={7} label="Keyword" />
                    <ScoreRing value={match?.semantic_score ?? 0} size={72} thickness={7} label="Contextual fit" />
                    {match?.cover_letter_score != null ? (
                      <ScoreRing
                        value={match.cover_letter_score}
                        size={72}
                        thickness={7}
                        label="Cover letter"
                      />
                    ) : null}
                  </div>
                </motion.div>

                <div className="panel-card p-4">
                  <h3 className="font-display text-sm font-semibold">AI rationale</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {match?.ai_summary ?? "No summary available."}
                  </p>
                  {(match?.strengths ?? []).length > 0 ? (
                    <>
                      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-success">
                        Strengths
                      </h4>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {match?.strengths.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </>
                  ) : null}
                  {(match?.concerns ?? []).length > 0 ? (
                    <>
                      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-warning-foreground">
                        Concerns
                      </h4>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {match?.concerns.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-card/95 p-4 backdrop-blur">
              <Button
                variant={candidate.status === "shortlisted" ? "default" : "outline"}
                onClick={() => onStatus("shortlisted")}
              >
                <Check className="size-4" aria-hidden />
                {candidate.status === "shortlisted" ? "Shortlisted" : "Shortlist"}
              </Button>
              <Button
                variant={candidate.status === "rejected" ? "destructive" : "outline"}
                onClick={() => onStatus("rejected")}
              >
                <X className="size-4" aria-hidden />
                {candidate.status === "rejected" ? "Rejected" : "Reject"}
              </Button>
              <Button variant="ghost" onClick={onClose} className="ml-auto">
                Back to dashboard
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
