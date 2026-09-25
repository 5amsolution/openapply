"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, ExternalLink, PartyPopper, Puzzle } from "lucide-react";
import { resumeDownloadUrlAction, updateApplicationAction } from "@/app/(app)/actions";
import { Badge, Button, Card, Notice, cn } from "@/components/ui";
import { Spinner } from "@/components/progress";
import { sourceLabel } from "@/lib/jobs/labels";
import type { Application, Job } from "@/lib/types";

type ProfileBits = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  salary_expectation: string | null;
  notice_period: string | null;
  work_authorization: string | null;
};

export function ApplyWorkspace({
  application,
  job,
  embedUrl,
  externalUrl,
  profile,
  resumeFilename,
}: {
  application: Application;
  job: Job;
  embedUrl: string | null;
  externalUrl: string;
  profile: ProfileBits;
  resumeFilename: string | null;
}) {
  const router = useRouter();
  const [frameLoaded, setFrameLoaded] = useState(false);
  // Point the iframe at the form only after hydration, so its load event can't fire before React listens.
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!embedUrl || !frame.current) return;
    frame.current.src = embedUrl;
    const fallback = setTimeout(() => setFrameLoaded(true), 6000);
    return () => clearTimeout(fallback);
  }, [embedUrl]);
  const [applied, setApplied] = useState(application.status === "applied");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  // Run async work outside a transition so "busy" state renders immediately
  // (state set inside startTransition only shows once the whole action finishes).
  const start = (fn: () => Promise<void>) => void fn();

  const markApplied = () =>
    start(async () => {
      setBusy("applied");
      setError("");
      const res = await updateApplicationAction(application.id, { status: "applied" });
      setBusy("");
      if (!res.ok) return setError(res.error);
      setApplied(true);
      router.refresh();
    });

  const downloadResume = () =>
    start(async () => {
      setBusy("resume");
      const res = await resumeDownloadUrlAction();
      setBusy("");
      if (!res.ok) return setError(res.error);
      window.open(res.data, "_blank", "noopener");
    });

  const details: [string, string | null][] = [
    ["Full name", profile.full_name],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Location", profile.location],
    ["LinkedIn", profile.linkedin],
    ["GitHub", profile.github],
    ["Portfolio", profile.portfolio],
    ["Salary expectation", profile.salary_expectation],
    ["Notice period", profile.notice_period],
    ["Work authorization", profile.work_authorization],
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Employer form */}
      <Card className="flex min-h-[70vh] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">
              {job.title} · {job.company}
            </p>
            <p className="text-xs text-muted">
              {embedUrl ? `The employer's own application form (${sourceLabel(job.source)}) — you submit it directly to them.` : `Listing from ${sourceLabel(job.source)}`}
            </p>
          </div>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
          >
            Open in new tab <ExternalLink size={14} />
          </a>
        </div>

        {embedUrl ? (
          <div className="relative flex-1">
            {!frameLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface text-sm text-muted">
                <Spinner className="h-6 w-6 text-accent" />
                Loading the employer&apos;s application form…
              </div>
            )}
            <iframe
              ref={frame}
              title={`Application form for ${job.title} at ${job.company}`}
              className="h-full min-h-[70vh] w-full bg-white"
              onLoad={() => setFrameLoaded(true)}
              allow="clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="max-w-md text-sm text-muted">
              {sourceLabel(job.source)} doesn&apos;t allow its application form to be shown inside other sites, so it opens in a new
              tab. Keep this page open next to it and copy each section across — or use the autofill extension to do it in one
              click.
            </p>
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-ink-fg shadow-[0_6px_16px_rgba(21,32,26,0.16)] hover:opacity-95"
            >
              Open the application form <ExternalLink size={14} />
            </a>
          </div>
        )}
      </Card>

      {/* Helper panel */}
      <div className="grid content-start gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
        {applied ? (
          <Notice tone="accent">
            <span className="inline-flex items-center gap-2 font-medium">
              <PartyPopper size={16} /> Marked as applied — good luck!
            </span>{" "}
            <Link href="/jobs" className="underline">
              Find the next one
            </Link>
          </Notice>
        ) : (
          <Card className="grid gap-2 p-4">
            <p className="text-sm font-medium">How to apply</p>
            <ol className="grid gap-1 text-sm text-muted">
              <li>1. Fill the form using the copy buttons below.</li>
              <li>2. Attach your resume and review everything.</li>
              <li>3. Submit, then mark it as applied here.</li>
            </ol>
            <Button onClick={markApplied} loading={busy === "applied"} className="mt-1">
              <Check size={14} /> I submitted it — mark as applied
            </Button>
          </Card>
        )}
        {error && <Notice tone="danger">{error}</Notice>}

        <Card className="grid gap-2 p-4">
          <p className="text-sm font-medium">Resume</p>
          {resumeFilename ? (
            <Button variant="secondary" onClick={downloadResume} loading={busy === "resume"}>
              {busy !== "resume" && <Download size={14} />} Download {resumeFilename}
            </Button>
          ) : (
            <p className="text-sm text-muted">
              <Link href="/profile" className="underline">
                Upload your resume
              </Link>{" "}
              to attach it here.
            </p>
          )}
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-sm font-medium">Your details</p>
          <div className="grid gap-1.5">
            {details
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <CopyRow key={label} label={label} value={value!} />
              ))}
          </div>
        </Card>

        {application.cover_letter ? (
          <>
            <CopyBlock title="Cover letter" text={application.cover_letter} />
            {application.tailored_summary && <CopyBlock title="Summary" text={application.tailored_summary} />}
            {application.answers.length > 0 && (
              <Card className="p-4">
                <p className="mb-2 text-sm font-medium">Screening answers</p>
                <div className="grid gap-3">
                  {application.answers.map((a) => (
                    <div key={a.question} className="rounded-lg bg-surface-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium">{a.question}</p>
                        <CopyButton text={a.answer} />
                      </div>
                      <p className="mt-1 line-clamp-4 text-sm text-muted">{a.answer}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        ) : (
          <Notice>
            No tailored cover letter yet.{" "}
            <Link href={`/applications/${application.id}`} className="underline">
              Write one with AI
            </Link>{" "}
            first for the best result.
          </Notice>
        )}

        <Card className="flex gap-3 p-4 text-sm text-muted">
          <Puzzle size={16} className="mt-0.5 shrink-0 text-accent" />
          <p>
            The OpenApply browser extension can fill this form for you in one click.{" "}
            <Link href="/settings#extension" className="underline">
              Set it up
            </Link>
            .
          </p>
        </Card>
        <p className="text-xs text-muted">
          <Badge>{sourceLabel(job.source)}</Badge> OpenApply never submits for you — the employer receives exactly what you send.
        </p>
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-surface-2">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

function CopyBlock({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <CopyButton text={text} label />
      </div>
      <p className="line-clamp-6 whitespace-pre-line text-sm text-muted">{text}</p>
    </Card>
  );
}

function CopyButton({ text, label }: { text: string; label?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition",
        copied ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {label && (copied ? "Copied" : "Copy")}
    </button>
  );
}
