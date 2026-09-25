"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Target } from "lucide-react";
import { analyzeJobAction, draftApplicationAction, saveJobAction } from "@/app/(app)/actions";
import { Button, Card, Notice, ScoreBadge } from "@/components/ui";
import { ProgressSteps, STEPS, friendlyError } from "@/components/progress";
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
      if (kind === "draft") router.push(`/applications/${res.data.id}`);
      else router.refresh();
    });

  const aiScored = app?.match_summary && !app.match_summary.startsWith("Keyword estimate");
  const score = app?.match_score ?? estimate?.score;
  const strengths = app?.match_strengths?.length ? app.match_strengths : estimate?.strengths ?? [];
  const gaps = app?.match_gaps?.length ? app.match_gaps : estimate?.gaps ?? [];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium">
          <Target size={16} className="text-accent" /> Your fit
        </h2>
        <ScoreBadge score={score} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {aiScored ? app!.match_summary : estimate?.summary ?? "Upload your resume for a fit estimate."}
      </p>

      {strengths.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Strengths</p>
          <ul className="mt-1.5 grid gap-1 text-sm">
            {strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-accent">+</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {gaps.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Gaps</p>
          <ul className="mt-1.5 grid gap-1 text-sm">
            {gaps.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-warn">–</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-2">
        {!hasResume && (
          <Notice tone="warn">
            <Link href="/profile" className="underline">
              Upload your resume
            </Link>{" "}
            first so the AI knows your background.
          </Notice>
        )}
        {!aiReady && (
          <Notice>
            AI is free to turn on.{" "}
            <Link href="/settings" className="underline">
              Connect in Settings
            </Link>
            .
          </Notice>
        )}
        {app?.cover_letter ? (
          <Link
            href={`/applications/${app.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-ink-fg shadow-[0_6px_16px_rgba(21,32,26,0.16)] hover:opacity-95"
          >
            Open application ({STATUS_LABELS[app.status]})
          </Link>
        ) : null}
        {app?.cover_letter ? (
          <Link
            href={`/applications/${app.id}/apply`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-medium hover:bg-surface-2"
          >
            Apply now
          </Link>
        ) : (
          <Button onClick={() => run("draft")} disabled={!aiReady || !hasResume || !!busy} loading={busy === "draft"}>
            {busy !== "draft" && <Sparkles size={16} />}
            {busy === "draft" ? "Writing your application…" : "Write application"}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => run("analyze")} disabled={!aiReady || !hasResume || !!busy} loading={busy === "analyze"}>
            {busy === "analyze" ? "Scoring…" : aiScored ? "Re-score" : "AI fit score"}
          </Button>
          <Button variant="secondary" onClick={() => run("save")} disabled={!!app || !!busy} loading={busy === "save"}>
            {app ? "Saved" : busy === "save" ? "Saving…" : "Save job"}
          </Button>
        </div>
        <ProgressSteps active={busy === "draft" || busy === "analyze"} steps={busy === "draft" ? STEPS.draft : STEPS.score} />
        {error && !busy && <Notice tone="danger">{error}</Notice>}
      </div>
    </Card>
  );
}
