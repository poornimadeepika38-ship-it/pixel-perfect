import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useState } from "react";

export function scoreTone(score: number) {
  if (score >= 75) return "success" as const;
  if (score >= 50) return "warning" as const;
  return "destructive" as const;
}

const strokeVar = {
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
};

export function ScoreRing({
  value,
  size = 88,
  thickness = 8,
  label,
}: {
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useMotionValue(0);
  const dashoffset = useTransform(progress, (p) => circumference * (1 - p / 100));
  const [display, setDisplay] = useState(0);
  const tone = scoreTone(value);

  useEffect(() => {
    const controls = animate(progress, value, { duration: 0.8, ease: "easeOut" });
    const unsubscribe = progress.on("change", (v) => setDisplay(Math.round(v)));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [progress, value]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label ?? "Score"}: ${value} out of 100`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={thickness}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeVar[tone]}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashoffset }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-display font-semibold tabular-nums"
            style={{ fontSize: size * 0.28 }}
          >
            {display}
          </span>
        </div>
      </div>
      {label ? (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      ) : null}
    </div>
  );
}

export function ScoreBar({ value }: { value: number }) {
  const tone = scoreTone(value);
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-sm font-semibold tabular-nums">{value}</span>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: strokeVar[tone] }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
