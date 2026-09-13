import { motion } from "motion/react";
import { GraduationCap, ListChecks, Sparkles, Timer } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SkillPill } from "@/components/SkillPill";
import type { JobDescription } from "@/lib/screening.functions";

function Card({
  title,
  icon,
  index,
  children,
}: {
  title: string;
  icon: ReactNode;
  index: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06, ease: "easeOut" }}
      className="panel-card p-5"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </motion.div>
  );
}

export function JdBreakdown({
  jd,
  onEdit,
  onContinue,
}: {
  jd: JobDescription;
  onEdit: () => void;
  onContinue: () => void;
}) {
  const experience =
    jd.min_experience_years == null && jd.max_experience_years == null
      ? "Not specified"
      : jd.max_experience_years == null
        ? `${jd.min_experience_years}+ years`
        : jd.min_experience_years == null
          ? `Up to ${jd.max_experience_years} years`
          : `${jd.min_experience_years}–${jd.max_experience_years} years`;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-sm font-medium text-teal">Role understood</p>
        <h1 className="mt-1 font-display text-3xl font-bold">{jd.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {jd.company}
          {jd.job_level ? ` · ${jd.job_level} level` : ""}
        </p>
        {jd.role_summary ? (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {jd.role_summary}
          </p>
        ) : null}
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Required skills" icon={<ListChecks className="size-4" aria-hidden />} index={0}>
          <p className="mb-3 font-display text-3xl font-bold">{jd.required_skills.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {jd.required_skills.map((skill, i) => (
              <SkillPill key={skill} tone="success" index={i}>
                {skill}
              </SkillPill>
            ))}
          </div>
        </Card>

        <Card title="Preferred skills" icon={<Sparkles className="size-4" aria-hidden />} index={1}>
          <p className="mb-3 font-display text-3xl font-bold">{jd.preferred_skills.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {jd.preferred_skills.map((skill, i) => (
              <SkillPill key={skill} tone="info" index={i}>
                {skill}
              </SkillPill>
            ))}
          </div>
        </Card>

        <Card title="Experience" icon={<Timer className="size-4" aria-hidden />} index={2}>
          <p className="font-display text-2xl font-bold">{experience}</p>
        </Card>

        <Card title="Education" icon={<GraduationCap className="size-4" aria-hidden />} index={3}>
          <p className="text-sm leading-relaxed">
            {jd.education_requirement ?? "Not specified"}
          </p>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="outline" onClick={onEdit}>
          Edit job description
        </Button>
        <Button onClick={onContinue}>Continue to resumes</Button>
      </div>
    </section>
  );
}
