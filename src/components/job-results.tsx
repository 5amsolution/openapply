"use client";

import { useMemo, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button, Select, cn } from "@/components/ui";
import { JobCard, type JobSummary } from "@/components/job-card";

export type ResultItem = { job: JobSummary; score: number | null; applicationId?: string; status?: string; rank: number };

const PAGE = 20;
type Sort = "relevance" | "fit" | "newest";
type Posted = "any" | "1" | "7" | "30";

const POSTED: [Posted, string][] = [
  ["any", "Any time"],
  ["1", "Past 24h"],
  ["7", "Past week"],
  ["30", "Past month"],
];

/** Search results with sorting, quick filters and "show more" paging, all instant in the browser. */
export function JobResults({ items, header }: { items: ResultItem[]; header: React.ReactNode }) {
  const [sort, setSort] = useState<Sort>("relevance");
  const [posted, setPosted] = useState<Posted>("any");
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [now] = useState(() => Date.now());

  const visible = useMemo(() => {
    const list = items.filter(({ job }) => {
      if (salaryOnly && !job.salary_min && !job.salary_max) return false;
      if (remoteOnly && !job.remote) return false;
      if (posted !== "any") {
        if (!job.posted_at) return false;
        if (now - new Date(job.posted_at).getTime() > Number(posted) * 86_400_000) return false;
      }
      return true;
    });
    if (sort === "fit") list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    else if (sort === "newest") list.sort((a, b) => (b.job.posted_at ?? "").localeCompare(a.job.posted_at ?? ""));
    else list.sort((a, b) => a.rank - b.rank);
    return list;
  }, [items, sort, posted, salaryOnly, remoteOnly, now]);

  const reset = () => setShown(PAGE);
  const summary =
    visible.length === items.length
      ? `${items.length} jobs · sorted by ${sort === "relevance" ? "relevance" : sort === "fit" ? "fit" : "date"}`
      : `${visible.length} of ${items.length} jobs match`;

  const toggle = (on: boolean) =>
    cn(
      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150",
      on ? "border-transparent bg-primary-soft text-primary-soft-fg" : "border-border-strong bg-surface text-muted hover:text-fg",
    );

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      {header}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-fg" aria-live="polite">
          {summary}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <SlidersHorizontal size={15} aria-hidden="true" className="text-muted" />
          <label htmlFor="sort" className="sr-only">
            Sort by
          </label>
          <Select
            id="sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              reset();
            }}
            className="h-9 rounded-full pl-3.5 text-[13px] font-semibold"
          >
            <option value="relevance">Best match</option>
            <option value="fit">Highest fit</option>
            <option value="newest">Newest</option>
          </Select>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0">
        <div role="group" aria-label="Posted" className="inline-flex rounded-full border border-border-strong bg-surface p-0.5">
          {POSTED.map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={posted === v}
              className={cn(
                "h-8 rounded-full px-3 text-[13px] font-semibold transition-colors duration-150",
                posted === v ? "bg-primary text-primary-fg shadow-xs" : "text-muted hover:text-fg",
              )}
              onClick={() => {
                setPosted(v);
                reset();
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={salaryOnly} className={toggle(salaryOnly)} onClick={() => (setSalaryOnly(!salaryOnly), reset())}>
          {salaryOnly && <Check size={14} aria-hidden="true" />} Salary listed
        </button>
        <button type="button" aria-pressed={remoteOnly} className={toggle(remoteOnly)} onClick={() => (setRemoteOnly(!remoteOnly), reset())}>
          {remoteOnly && <Check size={14} aria-hidden="true" />} Remote
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <p className="font-semibold text-fg">No jobs match these filters</p>
          <p className="mt-1 text-sm text-muted">Try a wider date range or turn off a filter.</p>
        </div>
      ) : (
        visible.slice(0, shown).map((it) => <JobCard key={it.job.id} job={it.job} score={it.score} applicationId={it.applicationId} status={it.status} />)
      )}

      {visible.length > shown && (
        <Button variant="secondary" className="mt-2 justify-self-center" onClick={() => setShown((n) => n + PAGE)}>
          Show {Math.min(PAGE, visible.length - shown)} more · {visible.length - shown} left
        </Button>
      )}
    </div>
  );
}
