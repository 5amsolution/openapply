"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Sparkles } from "lucide-react";
import { fillProfileFromResumeAction, uploadResumeAction } from "@/app/(app)/actions";
import { Button, Card, Notice } from "@/components/ui";
import { ProgressSteps, STEPS } from "@/components/progress";

type Message = { tone: "accent" | "danger" | "info" | "warn"; text: string };

export function ResumeUpload({ filename, aiReady }: { filename: string | null; aiReady: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  // Run async work outside a transition so "busy" state renders immediately
  // (state set inside startTransition only shows once the whole action finishes).
  const start = (fn: () => Promise<void>) => void fn();
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
          ? { tone: "accent", text: "Resume read. Your profile below was filled in — check it over and save." }
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
        res.ok
          ? { tone: "accent", text: "Profile filled from your resume — check it over and save." }
          : aiFailed(res.error),
      );
      router.refresh();
    });

  return (
    <Card
      className={`mb-6 p-5 transition ${dragging ? "border-accent bg-accent-soft/40" : ""}`}
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <FileUp size={18} />
          </div>
          <div>
            <p className="font-medium">{filename ? filename : "Upload your resume"}</p>
            <p className="text-sm text-muted">
              PDF, DOCX or TXT, up to 10 MB.{" "}
              {aiReady ? (
                "The AI will fill in your profile."
              ) : (
                <>
                  <Link href="/settings" className="underline">
                    Turn on AI (free)
                  </Link>{" "}
                  to auto-fill your profile.
                </>
              )}
            </p>
          </div>
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
        <div className="flex flex-wrap gap-2">
          {filename && aiReady && (
            <Button variant="secondary" onClick={refill} disabled={pending} loading={busy === "fill"}>
              {busy !== "fill" && <Sparkles size={14} />} {busy === "fill" ? "Filling profile…" : "Fill profile with AI"}
            </Button>
          )}
          <Button onClick={() => input.current?.click()} disabled={pending} loading={busy === "upload"}>
            {busy === "upload" ? "Uploading…" : filename ? "Replace resume" : "Choose file"}
          </Button>
        </div>
      </div>
      <ProgressSteps
        className="mt-4"
        active={busy === "fill" || (busy === "upload" && aiReady)}
        steps={busy === "upload" ? [{ label: "Uploading your resume", after: 0 }, ...STEPS.resume.map((st) => ({ ...st, after: st.after + 2 }))] : STEPS.resume}
      />
      {busy === "upload" && !aiReady && <p className="mt-3 text-sm text-muted">Uploading and reading your resume…</p>}
      {message && !busy && (
        <div className="mt-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
    </Card>
  );
}
