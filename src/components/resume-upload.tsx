"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { uploadResumeAction } from "@/app/(app)/actions";
import { Button, Card, Notice } from "@/components/ui";

export function ResumeUpload({ filename, aiReady }: { filename: string | null; aiReady: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "accent" | "danger" | "info"; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = (file: File) =>
    start(async () => {
      setMessage(null);
      const fd = new FormData();
      fd.set("resume", file);
      const res = await uploadResumeAction(fd);
      if (!res.ok) return setMessage({ tone: "danger", text: res.error });
      setMessage(
        res.data.parsedWithAI
          ? { tone: "accent", text: "Resume read. Your profile below was filled in — check it over and save." }
          : { tone: "info", text: "Resume uploaded. Add an AI key in Settings to auto-fill your whole profile from it." },
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
              {aiReady ? "The AI will fill in your profile." : (
                <>
                  <Link href="/settings" className="underline">Add an AI key</Link> to auto-fill your profile.
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
        <Button onClick={() => input.current?.click()} disabled={pending}>
          {pending ? "Reading resume…" : filename ? "Replace resume" : "Choose file"}
        </Button>
      </div>
      {message && (
        <div className="mt-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
    </Card>
  );
}
