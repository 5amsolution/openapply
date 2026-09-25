"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, CircleDot, ShieldCheck, Sparkles, Target } from "lucide-react";
import { analyzeJobAction, draftApplicationAction, saveJobAction } from "@/app/(app)/actions";
import { Button, ButtonLink, Card, Notice, ScoreRing } from "@/components/ui";
import { ProgressSteps, STEPS, friendlyError } from "@/components/progress";
import { toast } from "@/components/toast";
import { STATUS_LABELS } from "@/lib/format";
import type { Application } from "@/lib/types";
import type { KeywordMatch } from "@/lib/matching";

export function JobAIPanel({
  jobId,
  application,
  aiReady,
  hasResume,
  estimate,
}: {
  jobId: string;
  application: Application | null;
  aiReady: boolean;
  hasResume: boolean;
  estimate: KeywordMatch | null;
}) {
  const router = useRouter();
  const [app, setApp] = useState(application);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "analyze" | "draft" | "save">("");
  // Run async work outside a transition so "busy" state renders immediately
  // (state set inside startTransition only shows once the whole action finishes).
  const start = (fn: () => Promise<void>) =>
    void fn().catch((e) => {
      setBusy("");
      setError(friendlyError(e));
    });

  const run = (kind: "analyze" | "draft" | "save") =>
    start(async () => {
      setBusy(kind);
      setError("");
      const res =
        kind === "analyze"
          ? await analyzeJobAction(jobId)
          : kind === "draft"
            ? await draftApplicationAction(jobId)
            : await saveJobAction(jobId);
      setBusy("");
      if (!res.ok) return setError(res.error);
      setApp(res.data);
      if (kind === "draft") {
        toast("Your application is ready to review", { tone: "celebrate" });
        router.push(`/applications/${res.data.id}`);
      } else {
        if (kind === "save") toast("Saved to your applications", { href: `/applications/${res.data.id}`, action: "Open" });
        router.refresh();
      }
    });

  const aiScored = !!app?.match_summary && !app.match_summary.startsWith("Keyword estimate");
  const score = app?.match_score ?? estimate?.score;
  const strengths = app?.match_strengths?.length ? app.match_strengths : estimate?.strengths ?? [];
  const gaps = app?.match_gaps?.length ? app.match_gaps : estimate?.gaps ?? [];
  const blocked = !aiReady || !hasResume;

  return (
    <div className="grid gap-4">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-fg">
            <Target size={18} aria-hidden="true" className="text-primary-text" /> Your fit
          </h2>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">{aiScored ? "Scored by AI" : "Quick estimate"}</span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <ScoreRing score={score} size={76} />
          <p className="text-sm leading-relaxed text-muted">
            {aiScored ? app!.match_summary : estimate?.summary ?? "Upload your resume for a fit estimate."}
          </p>
        </div>

        {strengths.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Why you fit</p>
            <ul className="mt-2 grid gap-2 text-sm text-fg">
              {strengths.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <CheckCircle2 size={17} aria-hidden="true" className="mt-px shrink-0 text-success" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {gaps.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Worth addressing</p>
            <ul className="mt-2 grid gap-2 text-sm text-fg">
              {gaps.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <CircleDot size={17} aria-hidden="true" className="mt-px shrink-0 text-warn" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid gap-2.5">
          {!hasResume && (
            <Notice tone="warn">
              <Link href="/profile">Upload your resume</Link> first so the AI knows your background.
            </Notice>
          )}
          {!aiReady && (
            <Notice tone="primary">
              AI is free to turn on. <Link href="/settings">Connect in Settings</Link> — it takes one click.
            </Notice>
          )}

          {app?.cover_letter ? (
            <>
              <ButtonLink href={`/applications/${app.id}/apply`} size="lg">
                Apply now <ArrowRight size={17} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href={`/applications/${app.id}`} variant="secondary">
                Open application · {STATUS_LABELS[app.status]}
              </ButtonLink>
            </>
          ) : (
            <Button size="lg" onClick={() => run("draft")} disabled={blocked || !!busy} loading={busy === "draft"}>
              {busy !== "draft" && <Sparkles size={17} aria-hidden="true" />}
              {busy === "draft" ? "Writing your application…" : "Write application"}
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => run("analyze")} disabled={blocked || !!busy} loading={busy === "analyze"}>
              {busy === "analyze" ? "Scoring…" : aiScored ? "Re-score" : "AI fit score"}
            </Button>
            <Button
              variant={app ? "soft" : "secondary"}
              onClick={() => !app && run("save")}
              aria-disabled={!!app || undefined}
              disabled={!app && !!busy}
              loading={busy === "save"}
            >
              {busy !== "save" && (app ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />)}
              {app ? "Saved" : busy === "save" ? "Saving…" : "Save job"}
            </Button>
          </div>
          <ProgressSteps active={busy === "draft" || busy === "analyze"} steps={busy === "draft" ? STEPS.draft : STEPS.score} />
          {error && !busy && <Notice tone="danger">{error}</Notice>}
        </div>
      </Card>

      <p className="flex gap-2.5 px-1 text-[13px] leading-relaxed text-muted">
        <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
        The AI writes only from your own profile and never invents experience. You review everything before you apply.
      </p>
    </div>
  );
}
