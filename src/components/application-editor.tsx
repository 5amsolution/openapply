"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, ExternalLink, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import {
  answerQuestionsAction,
  deleteApplicationAction,
  draftApplicationAction,
  resumeDownloadUrlAction,
  updateApplicationAction,
} from "@/app/(app)/actions";
import { Badge, Button, Card, Notice, ScoreBadge, Textarea } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";
import { ProgressSteps, STEPS, friendlyError } from "@/components/progress";
import { sourceLabel } from "@/lib/jobs/labels";
import type { Application, Job } from "@/lib/types";

export function ApplicationEditor({
  application,
  job,
  aiReady,
  resumeFilename,
}: {
  application: Application;
  job: Job;
  aiReady: boolean;
  resumeFilename: string | null;
}) {
  const router = useRouter();
  const [app, setApp] = useState(application);
  const [coverLetter, setCoverLetter] = useState(application.cover_letter ?? "");
  const [summary, setSummary] = useState(application.tailored_summary ?? "");
  const [answers, setAnswers] = useState(application.answers ?? []);
  const [notes, setNotes] = useState(application.notes ?? "");
  const [newQuestions, setNewQuestions] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Run async work outside a transition so "busy" state renders immediately
  // (state set inside startTransition only shows once the whole action finishes).
  const start = (fn: () => Promise<void>) => void fn();

  const dirty =
    coverLetter !== (app.cover_letter ?? "") ||
    summary !== (app.tailored_summary ?? "") ||
    notes !== (app.notes ?? "") ||
    JSON.stringify(answers) !== JSON.stringify(app.answers ?? []);

  const act = (label: string, fn: () => Promise<void>) =>
    start(async () => {
      setBusy(label);
      setError("");
      try {
        await fn();
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy("");
      }
    });

  const save = () =>
    act("save", async () => {
      const res = await updateApplicationAction(app.id, {
        cover_letter: coverLetter,
        tailored_summary: summary,
        notes,
        answers,
      });
      if (!res.ok) throw new Error(res.error);
      setApp({ ...app, cover_letter: coverLetter, tailored_summary: summary, notes, answers });
      setSavedAt(Date.now());
    });

  const regenerate = () =>
    act("draft", async () => {
      const res = await draftApplicationAction(job.id);
      if (!res.ok) throw new Error(res.error);
      setApp(res.data);
      setCoverLetter(res.data.cover_letter ?? "");
      setSummary(res.data.tailored_summary ?? "");
      setAnswers(res.data.answers ?? []);
    });

  const askAI = () =>
    act("answers", async () => {
      const qs = newQuestions.split("\n").map((q) => q.trim()).filter(Boolean);
      const res = await answerQuestionsAction(app.id, qs);
      if (!res.ok) throw new Error(res.error);
      setApp(res.data);
      setAnswers(res.data.answers ?? []);
      setNewQuestions("");
    });

  const markApplied = () =>
    act("applied", async () => {
      if (dirty) {
        const r = await updateApplicationAction(app.id, { cover_letter: coverLetter, tailored_summary: summary, notes, answers });
        if (!r.ok) throw new Error(r.error);
      }
      const res = await updateApplicationAction(app.id, { status: "applied" });
      if (!res.ok) throw new Error(res.error);
      router.refresh();
      setApp({ ...app, status: "applied" });
    });

  const remove = () =>
    act("delete", async () => {
      const res = await deleteApplicationAction(app.id);
      if (!res.ok) throw new Error(res.error);
      router.push("/applications");
    });

  const downloadResume = () =>
    act("resume", async () => {
      const res = await resumeDownloadUrlAction();
      if (!res.ok) throw new Error(res.error);
      window.open(res.data, "_blank", "noopener");
    });

  const hasDraft = !!app.cover_letter;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="grid min-w-0 gap-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/jobs/${job.id}`} className="text-xl font-semibold tracking-tight hover:text-accent">
                {job.title}
              </Link>
              <p className="text-muted">
                {job.company}
                {job.location ? ` · ${job.location}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {app.origin === "autopilot" && <Badge tone="info">Autopilot</Badge>}
              <ScoreBadge score={app.match_score} />
            </div>
          </div>
          {app.match_summary && <p className="mt-3 text-sm text-muted">{app.match_summary}</p>}
        </Card>

        {!hasDraft ? (
          <Card className="p-6 text-center">
            <p className="font-medium">No application written yet</p>
            <p className="mt-1 text-sm text-muted">Generate a tailored cover letter, resume summary and screening answers.</p>
            <Button className="mt-4" onClick={regenerate} disabled={!aiReady || !!busy} loading={busy === "draft"}>
              {busy !== "draft" && <Sparkles size={16} />} {busy === "draft" ? "Writing your application…" : "Write application"}
            </Button>
            <ProgressSteps className="mx-auto mt-4 max-w-md text-left" active={busy === "draft"} steps={STEPS.draft} />
            {!aiReady && (
              <p className="mt-3 text-sm text-muted">
                <Link href="/settings" className="underline">
                  Turn on AI (free)
                </Link>{" "}
                to enable this.
              </p>
            )}
          </Card>
        ) : (
          <>
            <Section title="Cover letter" copyText={coverLetter}>
              <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="min-h-80" />
            </Section>

            <Section title="Tailored summary" copyText={summary} hint="Paste at the top of your resume or into “summary” fields.">
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
            </Section>

            {app.tailored_bullets?.length > 0 && (
              <Section
                title="Tailored experience bullets"
                copyText={app.tailored_bullets.map((b) => `${b.role}\n${b.bullets.map((x) => `• ${x}`).join("\n")}`).join("\n\n")}
              >
                <div className="grid gap-3 text-sm">
                  {app.tailored_bullets.map((b) => (
                    <div key={b.role}>
                      <p className="font-medium">{b.role}</p>
                      <ul className="mt-1 grid gap-1 text-muted">
                        {b.bullets.map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Screening answers">
              <div className="grid gap-4">
                {answers.map((a, i) => (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{a.question}</p>
                      <div className="flex shrink-0 gap-1">
                        <CopyButton text={a.answer} />
                        <button
                          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-danger"
                          title="Remove"
                          onClick={() => setAnswers(answers.filter((_, j) => j !== i))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <Textarea
                      value={a.answer}
                      onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                    />
                  </div>
                ))}
                <div className="rounded-lg border border-dashed border-border p-3">
                  <p className="mb-2 text-sm font-medium">The form asks something else?</p>
                  <Textarea
                    placeholder={"Paste the questions, one per line\ne.g. Describe a time you shipped under a tight deadline."}
                    value={newQuestions}
                    onChange={(e) => setNewQuestions(e.target.value)}
                  />
                  <Button variant="secondary" className="mt-2" onClick={askAI} disabled={!aiReady || !newQuestions.trim() || !!busy} loading={busy === "answers"}>
                    {busy !== "answers" && <Plus size={14} />} {busy === "answers" ? "Answering…" : "Answer with AI"}
                  </Button>
                  <ProgressSteps className="mt-3" active={busy === "answers"} steps={STEPS.answers} />
                </div>
              </div>
            </Section>
          </>
        )}

        <Section title="Private notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Recruiter name, interview dates, follow-ups…" />
        </Section>
      </div>

      <div className="grid content-start gap-4 lg:sticky lg:top-6 lg:self-start">
        <Card className="grid gap-3 p-5">
          <div>
            <p className="mb-1.5 text-sm font-medium">Status</p>
            <StatusSelect key={app.status} id={app.id} status={app.status} />
          </div>
          <Button onClick={save} disabled={!dirty || !!busy} loading={busy === "save"}>
            {busy === "save" ? "Saving…" : dirty ? "Save changes" : savedAt ? "Saved" : "No changes"}
          </Button>
          {error && <Notice tone="danger">{error}</Notice>}
        </Card>

        <Card className="grid gap-2 p-5">
          <p className="text-sm font-medium">Apply</p>
          <p className="mb-1 text-sm text-muted">
            Apply without leaving OpenApply: the employer&apos;s form on one side, your answers ready to copy on the other.
          </p>
          <Link
            href={`/applications/${app.id}/apply`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-ink-fg shadow-[0_6px_16px_rgba(21,32,26,0.16)] hover:opacity-95"
          >
            Apply now
          </Link>
          <a
            href={job.apply_url || job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm hover:bg-surface-2"
          >
            Open employer page <ExternalLink size={14} />
          </a>
          {resumeFilename && (
            <Button variant="secondary" onClick={downloadResume} disabled={!!busy}>
              <Download size={14} /> {resumeFilename}
            </Button>
          )}
          <Button variant="secondary" onClick={markApplied} disabled={app.status === "applied" || !!busy}>
            <Check size={14} /> {app.status === "applied" ? "Marked as applied" : "Mark as applied"}
          </Button>
          <p className="text-xs text-muted">Listing from {sourceLabel(job.source)}.</p>
        </Card>

        <Card className="grid gap-2 p-5">
          {hasDraft && (
            <Button variant="secondary" onClick={regenerate} disabled={!aiReady || !!busy} loading={busy === "draft"}>
              {busy !== "draft" && <RefreshCw size={14} />} {busy === "draft" ? "Rewriting…" : "Rewrite with AI"}
            </Button>
          )}
          {hasDraft && <ProgressSteps active={busy === "draft"} steps={STEPS.draft.slice(1)} />}
          <Button variant="danger" onClick={remove} disabled={!!busy}>
            <Trash2 size={14} /> Delete
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, hint, copyText, children }: { title: string; hint?: string; copyText?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">{title}</h2>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        {copyText != null && <CopyButton text={copyText} label />}
      </div>
      {children}
    </Card>
  );
}

function CopyButton({ text, label }: { text: string; label?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg"
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
