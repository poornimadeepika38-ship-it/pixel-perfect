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

const SAMPLE = `Senior React Developer

TechCorp Inc. seeks a Senior React Developer to lead frontend development.

Requirements:
- 5+ years web development
- React & TypeScript proficiency
- Node.js backend integration
- PostgreSQL knowledge
- REST API design & implementation
- Docker containerization
- Bachelor's in CS or equivalent

Nice to have: AWS, GraphQL, Jest, React Testing Library, Figma`;

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
