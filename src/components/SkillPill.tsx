import { motion } from "motion/react";
import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "info" | "navy";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  info: "bg-info-soft text-info",
  navy: "bg-accent text-accent-foreground",
};

export function SkillPill({
  children,
  tone = "neutral",
  index = 0,
}: {
  children: ReactNode;
  tone?: Tone;
  index?: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, delay: index * 0.04 }}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </motion.span>
  );
}
