import { useRef, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type UploadItem = {
  id: string;
  name: string;
  state: "queued" | "uploading" | "analyzing" | "done" | "failed";
  error?: string | undefined;
};

const MAX_FILES = 20;
const MAX_BYTES = 5 * 1024 * 1024;

function isAllowed(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt");
}

export function ResumeUpload({
  onAnalyze,
  running,
  items,
  onViewResults,
}: {
  onAnalyze: (files: File[]) => void;
  running: boolean;
  items: UploadItem[];
  onViewResults: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [hovering, setHovering] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: File[] = [];
    const problems: string[] = [];
    for (const file of Array.from(incoming)) {
      if (!isAllowed(file)) problems.push(`${file.name} is not a PDF, DOCX or TXT file`);
      else if (file.size > MAX_BYTES) problems.push(`${file.name} is larger than 5 MB`);
      else next.push(file);
    }
    setNotice(problems[0] ?? null);
    setFiles((current) => [...current, ...next].slice(0, MAX_FILES));
  };

  const done = items.filter((i) => i.state === "done" || i.state === "failed").length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Add the resumes</h1>
      <p className="mt-2 text-muted-foreground">
        PDF, DOCX or TXT, up to 5 MB each, {MAX_FILES} files maximum.
      </p>

      <motion.div
        animate={{ scale: hovering ? 1.02 : 1 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        onDragOver={(event) => {
          event.preventDefault();
          setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={(event) => {
          event.preventDefault();
          setHovering(false);
          addFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          hovering ? "border-teal bg-accent/50" : "border-border bg-card"
        }`}
      >
        <UploadCloud className="mx-auto size-10 text-teal" aria-hidden />
        <p className="mt-3 font-medium">Drag &amp; drop resumes here, or click to select</p>
        <p className="mt-1 text-sm text-muted-foreground">We never store anything beyond this demo session.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          aria-label="Select resume files"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </motion.div>

      {notice ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" aria-hidden /> {notice}
        </p>
      ) : null}

      {files.length > 0 && items.length === 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm"
            >
              <FileText className="size-3.5" aria-hidden />
              {file.name}
              <span className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="panel-card mt-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              {running ? "Analysing resumes…" : "Analysis complete"}
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {done} of {items.length}
            </span>
          </div>
          <Progress value={percent} className="mt-3" />
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                {item.state === "done" ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                    <CheckCircle2 className="size-4 text-success" aria-hidden />
                  </motion.span>
                ) : item.state === "failed" ? (
                  <AlertCircle className="size-4 text-destructive" aria-hidden />
                ) : item.state === "queued" ? (
                  <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
                ) : (
                  <Loader2 className="size-4 animate-spin text-teal" aria-hidden />
                )}
                <span className="truncate">{item.name}</span>
                {item.error ? (
                  <span className="ml-auto truncate text-xs text-destructive">{item.error}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {!running ? (
            <Button className="mt-5 w-full" onClick={onViewResults}>
              View ranked results
            </Button>
          ) : null}
        </div>
      ) : (
        <Button
          className="mt-6"
          disabled={files.length === 0 || running}
          onClick={() => onAnalyze(files)}
        >
          Analyze {files.length > 0 ? `${files.length} resume${files.length > 1 ? "s" : ""}` : "resumes"}
        </Button>
      )}
    </section>
  );
}
