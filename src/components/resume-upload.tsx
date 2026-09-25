"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, FileUp, Sparkles } from "lucide-react";
import { fillProfileFromResumeAction, uploadResumeAction } from "@/app/(app)/actions";
import { Button, Card, IconTile, Notice, cn } from "@/components/ui";
import { ProgressSteps, STEPS, friendlyError } from "@/components/progress";

type Message = { tone: "success" | "danger" | "info" | "warn"; text: string };

export function ResumeUpload({ filename, aiReady }: { filename: string | null; aiReady: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  // Run async work outside a transition so "busy" state renders immediately
  // (state set inside startTransition only shows once the whole action finishes).
  const start = (fn: () => Promise<void>) =>
    void fn().catch((e) => {
      setBusy("");
      setMessage({ tone: "danger", text: friendlyError(e) });
    });
  const [busy, setBusy] = useState<"" | "upload" | "fill">("");
  const [message, setMessage] = useState<Message | null>(null);
  const pending = busy !== "";
  const [dragging, setDragging] = useState(false);

  const aiFailed = (error: string): Message => ({
    tone: "warn",
    text: `Your resume is saved, but the AI couldn't read it this time: ${error} Click “Fill profile with AI” to try again.`,
  });

  const upload = (file: File) =>
    start(async () => {
      setBusy("upload");
      setMessage(null);
      const fd = new FormData();
      fd.set("resume", file);
      const res = await uploadResumeAction(fd);
      setBusy("");
      if (!res.ok) return setMessage({ tone: "danger", text: res.error });
      setMessage(
        res.data.parsedWithAI
          ? { tone: "success", text: "Resume read. Your profile below was filled in, so check it over and save." }
          : res.data.aiError
            ? aiFailed(res.data.aiError)
            : { tone: "info", text: "Resume uploaded. Turn on AI in Settings (free) to auto-fill your whole profile from it." },
      );
      router.refresh();
    });

  const refill = () =>
    start(async () => {
      setBusy("fill");
      setMessage(null);
      const res = await fillProfileFromResumeAction();
      setBusy("");
      setMessage(
        res.ok ? { tone: "success", text: "Profile filled from your resume. Check it over and save." } : aiFailed(res.error),
      );
      router.refresh();
    });

  return (
    <Card className="mb-6 p-2">
      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors duration-150 sm:flex-row sm:text-left",
          dragging ? "border-primary bg-primary-soft" : "border-border-strong",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
      >
        <IconTile tone={filename ? "success" : "primary"} size="lg">
          {filename ? <FileText size={22} /> : <FileUp size={22} />}
        </IconTile>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center justify-center gap-2 text-base font-bold text-fg sm:justify-start">
            <span className="truncate">{filename ?? "Upload your resume"}</span>
            {filename && <CheckCircle2 size={17} aria-hidden="true" className="shrink-0 text-success" />}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {filename ? "Drop a new file here to replace it. " : "Drag it here or choose a file. "}
            PDF, DOCX or TXT, up to 10 MB.{" "}
            {aiReady ? (
              "The AI fills in your profile from it."
            ) : (
              <>
                <Link href="/settings" className="font-semibold text-primary-text underline underline-offset-2">
                  Turn on AI (free)
                </Link>{" "}
                to fill your profile automatically.
              </>
            )}
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap justify-center gap-2">
          {filename && aiReady && (
            <Button variant="soft" onClick={refill} disabled={pending} loading={busy === "fill"}>
              {busy !== "fill" && <Sparkles size={16} aria-hidden="true" />} {busy === "fill" ? "Filling profile…" : "Fill profile with AI"}
            </Button>
          )}
          <Button variant={filename ? "secondary" : "primary"} onClick={() => input.current?.click()} disabled={pending} loading={busy === "upload"}>
            {busy !== "upload" && <FileUp size={16} aria-hidden="true" />}
            {busy === "upload" ? "Uploading…" : filename ? "Replace resume" : "Choose file"}
          </Button>
        </div>
      </div>
      {(busy || message) && (
        <div className="px-3 pb-3 pt-2">
          <ProgressSteps
            active={busy === "fill" || (busy === "upload" && aiReady)}
            steps={busy === "upload" ? [{ label: "Uploading your resume", after: 0 }, ...STEPS.resume.map((st) => ({ ...st, after: st.after + 2 }))] : STEPS.resume}
          />
          {busy === "upload" && !aiReady && <p className="text-sm text-muted">Uploading and reading your resume…</p>}
          {message && !busy && <Notice tone={message.tone}>{message.text}</Notice>}
        </div>
      )}
    </Card>
  );
}
