"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";

// Feedback for slow AI work. Server actions don't stream progress, so the
// steps advance on a timer that matches how long each phase usually takes,
// and the last step waits there until the work is done.

export type Step = { label: string; after: number }; // seconds since start

export const STEPS = {
  resume: [
    { label: "Reading your resume", after: 0 },
    { label: "Picking out your experience and skills", after: 5 },
    { label: "Filling in your profile", after: 14 },
    { label: "Almost done — free models can take up to a minute", after: 30 },
  ],
  score: [
    { label: "Reading the job description", after: 0 },
    { label: "Comparing it with your profile", after: 4 },
    { label: "Scoring your fit", after: 10 },
    { label: "Still thinking — free models can be slow at busy times", after: 25 },
  ],
  draft: [
    { label: "Scoring your fit for this job", after: 0 },
    { label: "Writing your cover letter", after: 8 },
    { label: "Tailoring your resume summary and bullets", after: 22 },
    { label: "Answering screening questions", after: 35 },
    { label: "Final touches — hang tight", after: 55 },
  ],
  answers: [
    { label: "Reading the questions", after: 0 },
    { label: "Writing answers from your experience", after: 5 },
    { label: "Almost done", after: 25 },
  ],
  autopilot: [
    { label: "Searching job boards for new matches", after: 0 },
    { label: "Filtering out jobs you've already seen", after: 12 },
    { label: "Scoring the most promising jobs with AI", after: 20 },
    { label: "Writing applications for the best matches", after: 45 },
    { label: "This run is taking a while — it can take a few minutes", after: 120 },
  ],
  test: [
    { label: "Contacting your AI provider", after: 0 },
    { label: "Waiting for a reply — free models can take a moment", after: 6 },
  ],
} satisfies Record<string, Step[]>;

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function useElapsed(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => {
      clearInterval(t);
      setElapsed(0);
    };
  }, [active]);
  return elapsed;
}

/** A panel listing each phase with a tick, spinner or dot, plus elapsed time. */
export function ProgressSteps({ steps, active, className }: { steps: Step[]; active: boolean; className?: string }) {
  const elapsed = useElapsed(active);
  if (!active) return null;
  const current = steps.reduce((idx, s, i) => (elapsed >= s.after ? i : idx), 0);

  return (
    <div
      className={cn("rounded-lg border border-accent/25 bg-accent-soft/50 px-4 py-3 text-sm", className)}
      role="status"
      aria-live="polite"
    >
      <ul className="grid gap-1.5">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "flex items-center gap-2 transition-opacity",
              i < current && "text-muted",
              i > current && "opacity-40",
            )}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {i < current ? (
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-accent" aria-hidden="true">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : i === current ? (
                <Spinner className="text-accent" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            <span className={cn(i === current && "font-medium")}>{s.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted tabular-nums">{elapsed}s elapsed · you can keep this page open while it works</p>
    </div>
  );
}

/** Slim animated bar for small inline waits. */
export function ProgressBar({ className }: { className?: string }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-accent/15", className)} role="progressbar" aria-label="Loading">
      <div className="h-full w-1/3 animate-[oa-slide_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
    </div>
  );
}

/** Turns low-level client errors into something a person can act on. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/unexpected response was received from the server|Failed to find Server Action|Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return "The connection to OpenApply was interrupted — it may have just been updated. Refresh the page and try again.";
  }
  return msg;
}
