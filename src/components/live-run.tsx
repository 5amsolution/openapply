"use client";

import { useEffect, useRef, useState } from "react";
import { runStatusAction, type RunStatus } from "@/app/(app)/actions";
import { Spinner, friendlyError } from "@/components/progress";

// Live view of an autopilot run happening in the background on the server.
// Polls the run record every few seconds; safe to leave, reload or come back.

export function LiveRun({ runId, onDone }: { runId: string; onDone: (status: RunStatus) => void }) {
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [problem, setProblem] = useState("");
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const res = await runStatusAction(runId);
        if (stopped) return;
        if (!res.ok) return setProblem(res.error);
        setProblem("");
        setStatus(res.data);
        if (res.data.finished) {
          stopped = true;
          done.current(res.data);
        }
      } catch (e) {
        if (!stopped) setProblem(friendlyError(e));
      }
    };
    void poll();
    const timer = setInterval(() => {
      if (!stopped) void poll();
    }, 3000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [runId]);

  const elapsed = status ? Math.max(0, Math.floor((now - new Date(status.startedAt).getTime()) / 1000)) : 0;
  const mins = Math.floor(elapsed / 60);
  const phase = !status
    ? "Starting…"
    : status.jobsFound === 0 && status.jobsScored === 0
      ? "Searching job boards for new matches…"
      : status.jobsScored === 0
        ? `Found ${status.jobsFound} new jobs. Scoring the most promising with AI…`
        : `Scored ${status.jobsScored} of the best matches. Writing applications for the strongest…`;

  return (
    <div className="mt-4 w-full overflow-hidden rounded-xl border border-border bg-surface-2 text-sm" role="status" aria-live="polite">
      <div className="h-1 overflow-hidden bg-surface-3" aria-hidden="true">
        <div className="h-full w-1/3 animate-[oa-slide_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2.5 font-semibold text-fg">
          <Spinner className="text-primary-text" /> {phase}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ["New jobs found", status?.jobsFound ?? 0],
            ["Scored by AI", status?.jobsScored ?? 0],
            ["Applications written", status?.draftsCreated ?? 0],
          ].map(([label, n]) => (
            <div key={label as string} className="rounded-xl border border-border bg-surface px-2 py-2.5">
              <p className="text-2xl font-extrabold tabular-nums text-fg">{n}</p>
              <p className="text-xs font-medium text-muted">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted tabular-nums">
          {mins > 0 ? `${mins}m ` : ""}
          {elapsed % 60}s running · this keeps going on the server even if you leave. Free AI models can take a few minutes
        </p>
        {problem && <p className="mt-1 text-xs font-medium text-danger">{problem}</p>}
      </div>
    </div>
  );
}
