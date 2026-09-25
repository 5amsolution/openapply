"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button, cn } from "@/components/ui";
import { JobCard, type JobSummary } from "@/components/job-card";

export type ResultItem = { job: JobSummary; score: number | null; applicationId?: string; status?: string; rank: number };

const PAGE = 20;
type Sort = "relevance" | "fit" | "newest";
type Posted = "any" | "1" | "7" | "30";

/** Search results with sorting, quick filters and "show more" paging — all instant, in the browser. */
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

  const chip = (on: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
      on ? "bg-ink text-ink-fg" : "bg-surface text-muted shadow-[0_0_0_1.5px_var(--border)] hover:text-fg",
    );
  const reset = () => setShown(PAGE);

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      {header}

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&>*]:shrink-0">
        <label className="relative">
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              reset();
            }}
            className="appearance-none rounded-full bg-surface py-1.5 pl-3 pr-8 text-xs font-semibold shadow-[0_0_0_1.5px_var(--border)]"
          >
            <option value="relevance">Sort: Best match</option>
            <option value="fit">Sort: Highest fit</option>
            <option value="newest">Sort: Newest</option>
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
        </label>
        {(
          [
            ["any", "Any time"],
            ["1", "Past 24h"],
            ["7", "Past week"],
            ["30", "Past month"],
          ] as [Posted, string][]
        ).map(([v, l]) => (
          <button
            key={v}
            type="button"
            className={chip(posted === v)}
            onClick={() => {
              setPosted(v);
              reset();
            }}
          >
            {l}
          </button>
        ))}
        <button type="button" className={chip(salaryOnly)} onClick={() => (setSalaryOnly(!salaryOnly), reset())}>
          Salary listed
        </button>
        <button type="button" className={chip(remoteOnly)} onClick={() => (setRemoteOnly(!remoteOnly), reset())}>
          Remote
        </button>
        <span className="hidden text-xs text-muted md:ml-auto md:inline">
          {visible.length === items.length ? `${items.length} jobs · sorted by ${sort === "relevance" ? "relevance" : sort === "fit" ? "fit" : "date"}` : `${visible.length} of ${items.length} jobs match`}
        </span>
      </div>

      <p className="text-xs text-muted md:hidden">
        {visible.length === items.length ? `${items.length} jobs · sorted by ${sort === "relevance" ? "relevance" : sort === "fit" ? "fit" : "date"}` : `${visible.length} of ${items.length} jobs match`}
      </p>
      {visible.length === 0 ? (
        <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted">No jobs match these filters — try widening them.</p>
      ) : (
        visible.slice(0, shown).map((it) => <JobCard key={it.job.id} job={it.job} score={it.score} applicationId={it.applicationId} status={it.status} />)
      )}

      {visible.length > shown && (
        <Button variant="secondary" className="justify-self-center" onClick={() => setShown((n) => n + PAGE)}>
          Show {Math.min(PAGE, visible.length - shown)} more · {visible.length - shown} left
        </Button>
      )}
    </div>
  );
}
