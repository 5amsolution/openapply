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
        ? `Found ${status.jobsFound} new jobs — scoring the most promising with AI…`
        : `Scored ${status.jobsScored} of the best matches — writing applications for the strongest…`;

  return (
    <div className="w-full basis-full rounded-2xl border border-accent/25 bg-accent-soft/50 px-4 py-3 text-sm" role="status" aria-live="polite">
      <div className="flex items-center gap-2 font-medium">
        <Spinner className="text-accent" /> {phase}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          ["New jobs found", status?.jobsFound ?? 0],
          ["Scored by AI", status?.jobsScored ?? 0],
          ["Applications written", status?.draftsCreated ?? 0],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-xl bg-surface/70 px-2 py-2">
            <p className="text-xl font-extrabold tabular-nums">{n}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted tabular-nums">
        {mins > 0 ? `${mins}m ` : ""}
        {elapsed % 60}s running · this keeps going on the server even if you leave this page — free AI models can take several
        minutes
      </p>
      {problem && <p className="mt-1 text-xs text-danger">{problem}</p>}
    </div>
  );
}
