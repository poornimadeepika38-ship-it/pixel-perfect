import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScoreBar } from "@/components/ScoreRing";
import { SkillPill } from "@/components/SkillPill";
import { ConfidenceBadge, IndustryDelta } from "@/components/MatchSignals";
import type { JobDescription, ScoredCandidate } from "@/lib/screening.functions";

type SortKey = "score" | "name" | "date";

export function Dashboard({
  jd,
  candidates,
  onOpen,
  onStatus,
  onAddMore,
}: {
  jd: JobDescription;
  candidates: ScoredCandidate[];
  onOpen: (candidate: ScoredCandidate) => void;
  onStatus: (candidate: ScoredCandidate, status: "shortlisted" | "rejected") => void;
  onAddMore: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<SortKey>("score");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const stats = useMemo(() => {
    const scores = candidates.map((c) => c.match?.overall_score ?? 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { total: candidates.length, avg, top: scores.length ? Math.max(...scores) : 0 };
  }, [candidates]);

  const visible = useMemo(() => {
    const query = debounced.trim().toLowerCase();
    const list = candidates.filter((candidate) => {
      const score = candidate.match?.overall_score ?? 0;
      if (score < minScore) return false;
      if (!query) return true;
      return (
        (candidate.full_name ?? candidate.file_name).toLowerCase().includes(query) ||
        candidate.parsed_skills.some((skill) => skill.toLowerCase().includes(query))
      );
    });
    return [...list].sort((a, b) => {
      if (sort === "name") {
        return (a.full_name ?? a.file_name).localeCompare(b.full_name ?? b.file_name);
      }
      if (sort === "date") return 0;
      return (b.match?.overall_score ?? 0) - (a.match?.overall_score ?? 0);
    });
  }, [candidates, debounced, minScore, sort]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{jd.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {jd.company}
            {jd.job_level ? ` · ${jd.job_level} level` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={onAddMore}>
          Add more resumes
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Candidates", value: stats.total },
          { label: "Average score", value: stats.avg },
          { label: "Top score", value: stats.top },
          { label: "Industry average", value: jd.industry_average_score ?? "–" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="panel-card p-4"
          >
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or skill"
            className="pl-9"
            aria-label="Search candidates"
          />
        </div>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-48" aria-label="Sort candidates">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Score (high → low)</SelectItem>
            <SelectItem value="name">Name (A → Z)</SelectItem>
            <SelectItem value="date">Date added</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex min-w-48 items-center gap-3">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Min score {minScore}</span>
          <Slider
            value={[minScore]}
            onValueChange={([value]) => setMinScore(value ?? 0)}
            max={100}
            step={5}
            aria-label="Minimum score"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="panel-card mt-6 hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Matched</th>
              <th className="px-4 py-3">Missing</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((candidate, index) => (
              <motion.tr
                key={candidate.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className="border-t border-border align-middle"
              >
                <td className="px-4 py-3 font-semibold tabular-nums">#{candidate.match?.rank ?? "–"}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{candidate.full_name ?? candidate.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.status === "failed"
                      ? (candidate.error_message ?? "This resume couldn't be read")
                      : (candidate.current_position ?? candidate.file_name)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <ScoreBar value={candidate.match?.overall_score ?? 0} />
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <IndustryDelta
                      score={candidate.match?.overall_score ?? 0}
                      average={jd.industry_average_score}
                    />
                    {candidate.match ? (
                      <ConfidenceBadge confidence={candidate.match.confidence} />
                    ) : null}
                    {candidate.cover_letter_file_name ? (
                      <span className="text-xs text-muted-foreground">+ cover letter</span>
                    ) : null}
                  </div>
                </td>
                <td className="max-w-56 px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(candidate.match?.matched_skills ?? []).slice(0, 4).map((skill, i) => (
                      <SkillPill key={skill} tone="success" index={i}>
                        {skill}
                      </SkillPill>
                    ))}
                  </div>
                </td>
                <td className="max-w-40 px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(candidate.match?.missing_skills ?? []).slice(0, 3).map((skill, i) => (
                      <SkillPill key={skill} tone="warning" index={i}>
                        {skill}
                      </SkillPill>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant={candidate.status === "shortlisted" ? "default" : "outline"}
                      onClick={() => onStatus(candidate, "shortlisted")}
                    >
                      <Check className="size-3.5" aria-hidden />
                      Shortlist
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onOpen(candidate)}>
                      View
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No candidates match these filters.
          </p>
        ) : null}
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 md:hidden">
        {visible.map((candidate, index) => (
          <motion.div
            key={candidate.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            className="panel-card p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                #{candidate.match?.rank ?? "–"} {candidate.full_name ?? candidate.file_name}
              </p>
            </div>
            <div className="mt-2">
              <ScoreBar value={candidate.match?.overall_score ?? 0} />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <IndustryDelta
                  score={candidate.match?.overall_score ?? 0}
                  average={jd.industry_average_score}
                />
                {candidate.match ? (
                  <ConfidenceBadge confidence={candidate.match.confidence} />
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(candidate.match?.matched_skills ?? []).slice(0, 5).map((skill, i) => (
                <SkillPill key={skill} tone="success" index={i}>
                  {skill}
                </SkillPill>
              ))}
              {(candidate.match?.missing_skills ?? []).slice(0, 3).map((skill, i) => (
                <SkillPill key={skill} tone="warning" index={i}>
                  {skill}
                </SkillPill>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant={candidate.status === "shortlisted" ? "default" : "outline"}
                onClick={() => onStatus(candidate, "shortlisted")}
              >
                <Check className="size-3.5" aria-hidden />
                Shortlist
              </Button>
              <Button
                size="sm"
                variant={candidate.status === "rejected" ? "destructive" : "ghost"}
                onClick={() => onStatus(candidate, "rejected")}
              >
                <X className="size-3.5" aria-hidden />
                Reject
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onOpen(candidate)}>
                Details
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
