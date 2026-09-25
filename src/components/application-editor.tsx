"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ListChecks,
  MessageSquareText,
  NotebookPen,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  answerQuestionsAction,
  deleteApplicationAction,
  draftApplicationAction,
  resumeDownloadUrlAction,
  updateApplicationAction,
} from "@/app/(app)/actions";
import { Badge, Button, ButtonLink, Card, IconTile, Label, Notice, STATUS_TONE, ScoreRing, Textarea, buttonClass, cn, type Tone } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";
import { CompanyLogo } from "@/components/company-logo";
import { ProgressSteps, STEPS, friendlyError } from "@/components/progress";
import { toast } from "@/components/toast";
import { celebrate } from "@/lib/celebrate";
import { STATUS_LABELS, timeAgo } from "@/lib/format";
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
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      toast("Changes saved");
    });

  const regenerate = () =>
    act("draft", async () => {
      const res = await draftApplicationAction(job.id);
      if (!res.ok) throw new Error(res.error);
      setApp(res.data);
      setCoverLetter(res.data.cover_letter ?? "");
      setSummary(res.data.tailored_summary ?? "");
      setAnswers(res.data.answers ?? []);
      toast("Your application is ready to review", { tone: "celebrate" });
    });

  const askAI = () =>
    act("answers", async () => {
      const qs = newQuestions.split("\n").map((q) => q.trim()).filter(Boolean);
      const res = await answerQuestionsAction(app.id, qs);
      if (!res.ok) throw new Error(res.error);
      setApp(res.data);
      setAnswers(res.data.answers ?? []);
      setNewQuestions("");
      toast(qs.length === 1 ? "Answer added" : `${qs.length} answers added`);
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
      setApp({ ...app, status: "applied", applied_at: new Date().toISOString() });
      celebrate();
      toast("Nice — application sent. Good luck!", { tone: "celebrate" });
    });

  const remove = () =>
    act("delete", async () => {
      const res = await deleteApplicationAction(app.id);
      if (!res.ok) throw new Error(res.error);
      toast("Application deleted");
      router.push("/applications");
    });

  const downloadResume = () =>
    act("resume", async () => {
      const res = await resumeDownloadUrlAction();
      if (!res.ok) throw new Error(res.error);
      window.open(res.data, "_blank", "noopener");
    });

  const hasDraft = !!app.cover_letter;
  const applied = app.status === "applied" || app.status === "interviewing" || app.status === "offer";
  const words = coverLetter.trim() ? coverLetter.trim().split(/\s+/).length : 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="grid min-w-0 content-start gap-5">
        {/* Job header */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <CompanyLogo src={job.company_logo} company={job.company} size={52} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-muted">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
                <h1 className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-[-0.025em] md:text-[26px]">
                  <Link href={`/jobs/${job.id}`} className="text-fg transition-colors hover:text-primary-text">
                    {job.title}
                  </Link>
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {app.origin === "autopilot" && (
                <Badge tone="violet">
                  <Bot size={12} aria-hidden="true" /> Autopilot
                </Badge>
              )}
              <Badge tone={STATUS_TONE[app.status] ?? "neutral"}>{STATUS_LABELS[app.status]}</Badge>
            </div>
          </div>
          {(app.match_summary || app.match_score != null) && (
            <div className="mt-5 flex items-center gap-4 rounded-xl bg-surface-2 p-4">
              <ScoreRing score={app.match_score} size={56} />
              <p className="text-sm leading-relaxed text-muted">{app.match_summary || "Fit score for this job."}</p>
            </div>
          )}
        </Card>

        {!hasDraft ? (
          <Card className="flex flex-col items-center px-6 py-10 text-center">
            <IconTile tone="primary" size="lg">
              <Sparkles size={22} />
            </IconTile>
            <h2 className="mt-4 text-lg font-bold tracking-tight">No application written yet</h2>
            <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted">
              The AI writes a tailored cover letter, resume summary and screening answers from your profile — usually in under a
              minute.
            </p>
            <Button size="lg" className="mt-5" onClick={regenerate} disabled={!aiReady || !!busy} loading={busy === "draft"}>
              {busy !== "draft" && <Sparkles size={17} aria-hidden="true" />} {busy === "draft" ? "Writing your application…" : "Write application"}
            </Button>
            <ProgressSteps className="mt-5 w-full max-w-md text-left" active={busy === "draft"} steps={STEPS.draft} />
            {!aiReady && (
              <Notice tone="primary" className="mt-5 text-left">
                <Link href="/settings">Turn on AI (free)</Link> to enable this — it takes one click.
              </Notice>
            )}
          </Card>
        ) : (
          <>
            <Section
              icon={<FileText size={18} />}
              tone="primary"
              title="Cover letter"
              hint={`${words} words · edit anything you like`}
              copyText={coverLetter}
            >
              <Textarea
                aria-label="Cover letter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="min-h-[22rem] text-[15px] leading-7"
              />
            </Section>

            <Section
              icon={<UserRound size={18} />}
              tone="violet"
              title="Tailored summary"
              copyText={summary}
              hint="Paste at the top of your resume or into “summary” fields."
            >
              <Textarea aria-label="Tailored summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
            </Section>

            {app.tailored_bullets?.length > 0 && (
              <Section
                icon={<ListChecks size={18} />}
                tone="info"
                title="Tailored experience bullets"
                hint="Swap these into your resume for this job."
                copyText={app.tailored_bullets.map((b) => `${b.role}\n${b.bullets.map((x) => `• ${x}`).join("\n")}`).join("\n\n")}
              >
                <div className="grid gap-4 text-sm">
                  {app.tailored_bullets.map((b) => (
                    <div key={b.role}>
                      <p className="font-semibold text-fg">{b.role}</p>
                      <ul className="mt-2 grid gap-1.5 text-muted">
                        {b.bullets.map((x) => (
                          <li key={x} className="flex gap-2.5 leading-relaxed">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section icon={<MessageSquareText size={18} />} tone="pink" title="Screening answers" hint="Answers to the questions application forms usually ask.">
              <div className="grid gap-4">
                {answers.length === 0 && <p className="text-sm text-muted">No screening questions yet — add any the form asks below.</p>}
                {answers.map((a, i) => (
                  <div key={i} className="rounded-xl border border-border p-3.5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="pt-1 text-sm font-semibold text-fg">{a.question}</p>
                      <div className="flex shrink-0 gap-1">
                        <CopyButton text={a.answer} />
                        <button
                          type="button"
                          className={buttonClass("ghost", "icon-sm", "hover:bg-danger-soft hover:text-danger-soft-fg")}
                          aria-label={`Remove answer: ${a.question}`}
                          title="Remove"
                          onClick={() => setAnswers(answers.filter((_, j) => j !== i))}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <Textarea
                      aria-label={a.question}
                      value={a.answer}
                      onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                    />
                  </div>
                ))}
                <div className="rounded-xl border border-dashed border-border-strong bg-surface-2 p-4">
                  <Label htmlFor="new-questions">The form asks something else?</Label>
                  <Textarea
                    id="new-questions"
                    placeholder={"Paste the questions, one per line\ne.g. Describe a time you shipped under a tight deadline."}
                    value={newQuestions}
                    onChange={(e) => setNewQuestions(e.target.value)}
                  />
                  <Button variant="secondary" className="mt-3" onClick={askAI} disabled={!aiReady || !newQuestions.trim() || !!busy} loading={busy === "answers"}>
                    {busy !== "answers" && <Plus size={16} aria-hidden="true" />} {busy === "answers" ? "Answering…" : "Answer with AI"}
                  </Button>
                  <ProgressSteps className="mt-3" active={busy === "answers"} steps={STEPS.answers} />
                </div>
              </div>
            </Section>
          </>
        )}

        <Section icon={<NotebookPen size={18} />} tone="neutral" title="Private notes" hint="Only you can see these.">
          <Textarea aria-label="Private notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Recruiter name, interview dates, follow-ups…" />
        </Section>
      </div>

      {/* Sidebar */}
      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 lg:sticky lg:top-8 lg:self-start" aria-label="Application actions">
        <Card className="grid gap-2.5 p-5">
          {applied ? (
            <div className="mb-1 flex items-start gap-3 rounded-xl bg-success-soft p-3.5 text-success-soft-fg">
              <CheckCircle2 size={20} aria-hidden="true" className="mt-px shrink-0" />
              <div className="text-sm">
                <p className="font-bold">{app.status === "applied" ? "Applied" : STATUS_LABELS[app.status]}</p>
                <p>{app.applied_at ? `Sent ${timeAgo(app.applied_at)}. ` : ""}Nice work — keep it going.</p>
              </div>
            </div>
          ) : (
            <div className="mb-1">
              <h2 className="text-base font-bold tracking-tight text-fg">Ready when you are</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Open the employer&apos;s form right here, with everything ready to copy across.
              </p>
            </div>
          )}
          <ButtonLink href={`/applications/${app.id}/apply`} size="lg" variant={applied ? "secondary" : "primary"}>
            Apply now <ArrowRight size={17} aria-hidden="true" />
          </ButtonLink>
          <a href={job.apply_url || job.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
            Open employer page <ExternalLink size={15} aria-hidden="true" />
          </a>
          {resumeFilename && (
            <Button variant="secondary" onClick={downloadResume} disabled={!!busy} loading={busy === "resume"} className="min-w-0">
              {busy !== "resume" && <Download size={16} aria-hidden="true" />} <span className="truncate">{resumeFilename}</span>
            </Button>
          )}
          <Button variant="soft" onClick={markApplied} disabled={applied || !!busy} loading={busy === "applied"}>
            {busy !== "applied" && <Check size={16} aria-hidden="true" />} {applied ? "Marked as applied" : "Mark as applied"}
          </Button>
          <p className="text-center text-xs text-muted">Listing from {sourceLabel(job.source)}</p>
        </Card>

        <Card className="grid gap-3 p-5">
          <div>
            <Label htmlFor="app-status">Status</Label>
            <StatusSelect key={app.status} id={app.id} status={app.status} inputId="app-status" />
          </div>
          {dirty || busy === "save" ? (
            <>
              <Button onClick={save} disabled={!!busy} loading={busy === "save"}>
                {busy === "save" ? "Saving…" : "Save changes"}
              </Button>
              <p className="flex items-center justify-center gap-2 text-xs font-semibold text-warn" role="status">
                <span className="h-2 w-2 rounded-full bg-warn" aria-hidden="true" /> You have unsaved changes
              </p>
            </>
          ) : (
            <p className="flex h-11 items-center justify-center gap-2 rounded-xl bg-success-soft text-sm font-semibold text-success-soft-fg" role="status">
              <CheckCircle2 size={16} aria-hidden="true" /> All changes saved
            </p>
          )}
          {error && <Notice tone="danger">{error}</Notice>}
        </Card>

        <Card className="grid gap-2.5 p-5">
          {hasDraft && (
            <>
              <Button variant="secondary" onClick={regenerate} disabled={!aiReady || !!busy} loading={busy === "draft"}>
                {busy !== "draft" && <RefreshCw size={16} aria-hidden="true" />} {busy === "draft" ? "Rewriting…" : "Rewrite with AI"}
              </Button>
              <ProgressSteps active={busy === "draft"} steps={STEPS.draft.slice(1)} />
            </>
          )}
          {confirmDelete ? (
            <div className="grid gap-2 rounded-xl bg-danger-soft p-3.5 text-danger-soft-fg">
              <p className="text-sm font-semibold">Delete this application? This can&apos;t be undone.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button variant="danger-solid" size="sm" onClick={remove} loading={busy === "delete"}>
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={!!busy}>
              <Trash2 size={16} aria-hidden="true" /> Delete application
            </Button>
          )}
        </Card>
      </aside>
    </div>
  );
}

function Section({
  icon,
  tone,
  title,
  hint,
  copyText,
  children,
}: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  hint?: string;
  copyText?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile tone={tone}>{icon}</IconTile>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-fg">{title}</h2>
            {hint && <p className="text-[13px] text-muted">{hint}</p>}
          </div>
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
      aria-label={label ? undefined : copied ? "Copied" : "Copy answer"}
      className={cn(
        buttonClass(copied ? "soft" : label ? "secondary" : "ghost", label ? "sm" : "icon-sm"),
        copied && "bg-success-soft text-success-soft-fg hover:bg-success-soft",
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
