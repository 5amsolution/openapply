"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, ExternalLink, FileText, Lock, PartyPopper, Puzzle, ShieldCheck } from "lucide-react";
import { resumeDownloadUrlAction, updateApplicationAction } from "@/app/(app)/actions";
import { Button, ButtonLink, Card, IconTile, Notice, buttonClass, cn } from "@/components/ui";
import { Spinner, friendlyError } from "@/components/progress";
import { celebrate } from "@/lib/celebrate";
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
  const start = (fn: () => Promise<void>) =>
    void fn().catch((e) => {
      setBusy("");
      setError(friendlyError(e));
    });

  const markApplied = () =>
    start(async () => {
      setBusy("applied");
      setError("");
      const res = await updateApplicationAction(application.id, { status: "applied" });
      setBusy("");
      if (!res.ok) return setError(res.error);
      setApplied(true);
      celebrate();
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
  const filled = details.filter(([, v]) => v);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      {/* Employer form */}
      <Card className="flex min-h-[72vh] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <IconTile tone="success" size="sm">
              <Lock size={15} />
            </IconTile>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-fg">
                {job.title} · {job.company}
              </h1>
              <p className="truncate text-xs text-muted">
                {embedUrl ? `The employer's own form on ${sourceLabel(job.source)}. You submit it directly to them` : `Listing from ${sourceLabel(job.source)}`}
              </p>
            </div>
          </div>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
            Open in new tab <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>

        {embedUrl ? (
          <div className="relative flex-1">
            {!frameLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface text-sm font-medium text-muted">
                <Spinner className="h-6 w-6 text-primary-text" />
                Loading the employer&apos;s application form…
              </div>
            )}
            <iframe
              ref={frame}
              title={`Application form for ${job.title} at ${job.company}`}
              className="h-full min-h-[72vh] w-full bg-white"
              onLoad={() => setFrameLoaded(true)}
              allow="clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <IconTile tone="primary" size="lg">
              <ExternalLink size={22} />
            </IconTile>
            <h2 className="text-lg font-bold tracking-tight">This form opens on the employer&apos;s site</h2>
            <p className="max-w-md text-[15px] leading-relaxed text-muted">
              {sourceLabel(job.source)} doesn&apos;t allow its application form inside other sites. Open it in a new tab, keep this
              page beside it and copy each section across, or let the autofill extension do it in one click.
            </p>
            <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
              Open the application form <ExternalLink size={16} aria-hidden="true" />
            </a>
          </div>
        )}
      </Card>

      {/* Helper panel */}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 xl:sticky xl:top-8 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto xl:pr-1 xl:[scrollbar-width:thin]">
        {applied ? (
          <Card className="border-transparent bg-success-soft p-5 text-success-soft-fg animate-[oa-pop_420ms_var(--ease-out)]">
            <div className="flex items-start gap-3">
              <PartyPopper size={22} aria-hidden="true" className="shrink-0" />
              <div>
                <p className="font-bold">Marked as applied. Good luck!</p>
                <p className="mt-1 text-sm">Every application is a step closer. Want to keep the momentum going?</p>
                <ButtonLink href="/jobs" variant="secondary" size="sm" className="mt-3">
                  Find the next one
                </ButtonLink>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <h2 className="text-base font-bold tracking-tight text-fg">How to apply</h2>
            <ol className="mt-3 grid gap-3 text-sm">
              {["Fill the form using the copy buttons below.", "Attach your resume and review everything.", "Submit, then mark it as applied here."].map((t, i) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-fg">{i + 1}</span>
                  <span className="pt-0.5 text-fg">{t}</span>
                </li>
              ))}
            </ol>
            <Button onClick={markApplied} loading={busy === "applied"} className="mt-4 w-full">
              {busy !== "applied" && <Check size={16} aria-hidden="true" />} I submitted it, mark as applied
            </Button>
          </Card>
        )}
        {error && <Notice tone="danger">{error}</Notice>}

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-fg">Resume</h2>
          {resumeFilename ? (
            <Button variant="secondary" onClick={downloadResume} loading={busy === "resume"} className="w-full min-w-0">
              {busy !== "resume" && <Download size={16} aria-hidden="true" />} <span className="truncate">Download {resumeFilename}</span>
            </Button>
          ) : (
            <p className="text-sm text-muted">
              <Link href="/profile" className="font-semibold text-primary-text underline underline-offset-2">
                Upload your resume
              </Link>{" "}
              to attach it here.
            </p>
          )}
        </Card>

        {filled.length > 0 && (
          <Card className="p-5">
            <h2 className="mb-2 text-sm font-bold text-fg">Your details</h2>
            <div className="-mx-2 grid grid-cols-[minmax(0,1fr)] gap-0.5">
              {filled.map(([label, value]) => (
                <CopyRow key={label} label={label} value={value!} />
              ))}
            </div>
          </Card>
        )}

        {application.cover_letter ? (
          <>
            <CopyBlock title="Cover letter" text={application.cover_letter} />
            {application.tailored_summary && <CopyBlock title="Summary" text={application.tailored_summary} />}
            {application.answers.length > 0 && (
              <Card className="p-5">
                <h2 className="mb-3 text-sm font-bold text-fg">Screening answers</h2>
                <div className="grid gap-2.5">
                  {application.answers.map((a) => (
                    <div key={a.question} className="rounded-xl bg-surface-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="pt-1.5 text-[13px] font-semibold text-fg">{a.question}</p>
                        <CopyButton text={a.answer} what="answer" />
                      </div>
                      <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-muted">{a.answer}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        ) : (
          <Notice tone="primary">
            No tailored cover letter yet. <Link href={`/applications/${application.id}`}>Write one with AI</Link> first for the
            best result.
          </Notice>
        )}

        <Card className="flex gap-3 p-4">
          <IconTile tone="primary" size="sm">
            <Puzzle size={15} />
          </IconTile>
          <p className="text-sm leading-relaxed text-muted">
            The 5AM Apply browser extension can fill this form in one click.{" "}
            <Link href="/settings#extension" className="font-semibold text-primary-text underline underline-offset-2">
              Set it up
            </Link>
          </p>
        </Card>
        <p className="flex gap-2 px-1 text-xs leading-relaxed text-muted">
          <ShieldCheck size={15} aria-hidden="true" className="shrink-0 text-success" />
          5AM Apply never submits for you. The employer receives exactly what you send.
        </p>
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-fg">{value}</p>
      </div>
      <CopyButton text={value} what={label} />
    </div>
  );
}

function CopyBlock({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
          <FileText size={16} aria-hidden="true" className="text-primary-text" /> {title}
        </h2>
        <CopyButton text={text} what={title} label />
      </div>
      <p className="line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-muted">{text}</p>
    </Card>
  );
}

function CopyButton({ text, label, what }: { text: string; label?: boolean; what: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label ? undefined : copied ? "Copied" : `Copy ${what.toLowerCase()}`}
      className={cn(
        buttonClass(label ? "secondary" : "ghost", label ? "sm" : "icon-sm"),
        copied && "border-transparent bg-success-soft text-success-soft-fg hover:bg-success-soft hover:text-success-soft-fg",
      )}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      {label && (copied ? "Copied" : "Copy")}
    </button>
  );
}
