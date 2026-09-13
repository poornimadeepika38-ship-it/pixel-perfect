import { Minus, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-success/15 text-success",
  medium: "bg-warning/20 text-warning-foreground",
  low: "bg-destructive/15 text-destructive",
};

export function ConfidenceBadge({
  confidence,
  className = "",
}: {
  confidence: string | null | undefined;
  className?: string;
}) {
  const level = (confidence ?? "medium").toLowerCase();
  const style = CONFIDENCE_STYLES[level] ?? CONFIDENCE_STYLES["medium"];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${style} ${className}`}
      title="How certain the AI is that this score reflects a real match"
    >
      <ShieldCheck className="size-3" aria-hidden />
      {level} confidence
    </span>
  );
}

export function IndustryDelta({
  score,
  average,
  className = "",
}: {
  score: number | null | undefined;
  average: number | null | undefined;
  className?: string;
}) {
  if (average == null) return null;
  const delta = Math.round((score ?? 0) - average);
  const Icon = delta > 2 ? TrendingUp : delta < -2 ? TrendingDown : Minus;
  const tone =
    delta > 2 ? "text-success" : delta < -2 ? "text-destructive" : "text-muted-foreground";
  const label =
    delta > 0 ? `+${delta} vs industry avg` : delta < 0 ? `${delta} vs industry avg` : "At industry avg";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${tone} ${className}`}
      title={`Typical applicants for this role average ${average}`}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
