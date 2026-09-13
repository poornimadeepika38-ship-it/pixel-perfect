import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE = `Senior Frontend Engineer (React) — Resume Scan
Location: Bengaluru (hybrid, 3 days on-site) · Full-time

About the role
We are a small product team building AI-assisted hiring tools used by recruiters every day. You will own the web application end to end: the screening dashboard, the candidate detail experience, and the upload pipeline. You will work directly with the founders and a designer, ship weekly, and be accountable for both the quality of the interface and the performance of the product in real recruiter workflows.

What you will do
- Build and maintain production React interfaces with TypeScript, from design hand-off to release
- Design component APIs and a shared design system that other engineers build on
- Integrate with REST and streaming APIs, handle loading, empty, and error states properly
- Work with Postgres-backed services and write the server-side glue your features need
- Own performance: bundle size, rendering cost, Core Web Vitals on real devices
- Write tests around critical flows and review teammates' pull requests

Requirements
- 5+ years building production web applications, at least 3 of them in React
- Strong TypeScript: generics, discriminated unions, and strict-mode codebases
- Solid CSS skills, ideally Tailwind, with real accessibility and responsive experience
- Comfortable with Node.js services and consuming or designing REST APIs
- Working knowledge of SQL and PostgreSQL data modelling
- Experience with Git-based team workflows, CI, and code review
- Bachelor's degree in Computer Science or equivalent practical experience

Nice to have
- Experience with AI or LLM-powered product features
- GraphQL, Jest or Vitest, Playwright, Docker
- Prior work in HR tech, recruiting, or another document-heavy domain
- Comfort collaborating in Figma and contributing to product decisions

What we offer
Competitive salary, meaningful equity, learning budget, and a short path from idea to production.`;

export function JdModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string) => void;
  isPending: boolean;
}) {
  const [text, setText] = useState("");
  const count = text.trim().length;
  const valid = count >= 200 && count <= 5000;

  const counterClass =
    count < 200 ? "text-destructive" : count < 500 ? "text-warning-foreground" : "text-success";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Paste the job description</DialogTitle>
          <DialogDescription>
            We read the requirements and turn them into a scoring rubric for every resume.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 5000))}
          placeholder="Paste the full job description here (minimum 200 characters)…"
          className="min-h-56 resize-none"
          aria-label="Job description text"
        />

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setText(SAMPLE)}
            className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Use a sample role
          </button>
          <span className={`flex items-center gap-1.5 font-medium tabular-nums ${counterClass}`}>
            {valid ? <Check className="size-4" aria-hidden /> : null}
            {count} / 5000
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(text.trim())} disabled={!valid || isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Reading the role…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden /> Parse &amp; continue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
