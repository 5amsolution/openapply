import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/server";
import { searchCachedJobs, searchJobs } from "@/lib/jobs/search";
import { allow } from "@/lib/rate-limit";
import { enabledSources } from "@/lib/jobs/sources";
import { getUserSourceKeyInfo } from "@/lib/source-keys";
import { keywordMatch } from "@/lib/matching";
import { Button, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { MapPin, Search } from "lucide-react";
import { JobResults, type ResultItem } from "@/components/job-results";
import { SourceFilter } from "@/components/source-filter";
import { ProgressSteps } from "@/components/progress";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Find jobs" };

export default async function JobsPage(props: PageProps<"/jobs">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const loc = typeof sp.loc === "string" ? sp.loc.trim() : "";
  const remote = sp.remote === "1";
  const src = typeof sp.src === "string" && sp.src ? sp.src.split(",") : [];

  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("desired_titles, desired_locations, remote_preference")
    .eq("id", user.id)
    .single();

  const hasOwnJSearch = !!(await getUserSourceKeyInfo(user.id, "jsearch"));
  const sources = enabledSources({ jsearchUserKey: hasOwnJSearch ? { key: "", monthlyLimit: 0 } : null }).map((s) => ({
    id: s.id,
    label: s.label,
  }));
  const suggestions = profile?.desired_titles ?? [];

  return (
    <>
      <PageHeader tint="lavender" eyebrow={<>🔎 {sources.length} job sources, searched live</>} title="Find jobs" description="One search across remote boards and top company career pages — every job scored against your resume." />

      <section className="bento pastel-lavender mb-6 p-4 md:p-5">
        <form className="grid gap-3" action="/jobs" role="search">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-surface py-1.5 pl-1.5 pr-4 shadow-[0_4px_14px_rgba(70,66,120,0.1)] transition focus-within:shadow-[0_0_0_3px_rgba(95,139,62,0.35),0_4px_14px_rgba(70,66,120,0.1)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2" aria-hidden="true">
                <Search size={17} />
              </span>
              <input
                name="q"
                defaultValue={q}
                required
                aria-label="Keywords"
                placeholder="Job title, skill or company — e.g. product designer"
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted/80"
              />
            </div>
            <div className="flex items-center gap-3 rounded-full bg-surface py-1.5 pl-1.5 pr-4 shadow-[0_4px_14px_rgba(70,66,120,0.1)] transition focus-within:shadow-[0_0_0_3px_rgba(95,139,62,0.35),0_4px_14px_rgba(70,66,120,0.1)] lg:w-64">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2" aria-hidden="true">
                <MapPin size={17} />
              </span>
              <input
                name="loc"
                defaultValue={loc || (q ? "" : profile?.desired_locations?.[0] ?? "")}
                aria-label="Location"
                placeholder="Location (optional)"
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted/80"
              />
            </div>
            <Button type="submit" className="h-[52px] px-7 text-[15px]">
              Search
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-medium">
              <input
                type="checkbox"
                name="remote"
                value="1"
                defaultChecked={remote || (!q && profile?.remote_preference === "remote")}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Remote only
            </label>
            <details className="group/src">
              <summary className="cursor-pointer list-none font-medium text-fg/70 hover:text-fg">Sources ({src.length ? src.length : "all"}) ▾</summary>
              <SourceFilter sources={sources} selected={src} />
            </details>
            {!q && suggestions.length > 0 && (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-fg/60">Try:</span>
                {suggestions.slice(0, 4).map((t) => (
                  <Link
                    key={t}
                    href={`/jobs?q=${encodeURIComponent(t)}${profile?.remote_preference === "remote" ? "&remote=1" : ""}`}
                    className="lift rounded-full bg-surface px-3 py-1 text-xs font-semibold"
                  >
                    {t}
                  </Link>
                ))}
              </span>
            )}
          </div>
        </form>
      </section>

      {q ? (
        <Suspense key={`${q}|${loc}|${remote}|${src.join(",")}`} fallback={<ResultsSkeleton />}>
          <Results userId={user.id} q={q} loc={loc} remote={remote} src={src} />
        </Suspense>
      ) : (
        <EmptyState title="Search for a role to get started">
          Results come from public job boards and company career pages. Every job links back to its original posting.
        </EmptyState>
      )}
    </>
  );
}

async function Results({ userId, q, loc, remote, src }: { userId: string; q: string; loc: string; remote: boolean; src: string[] }) {
  const { supabase } = await requireUser();
  const query = { keywords: q, location: loc || undefined, remoteOnly: remote, sources: src.length ? src : undefined, userId };
  const live = allow(`search:${userId}`, 20, 5 * 60_000);
  const [{ jobs, sources }, { data: profile }, { data: apps }] = await Promise.all([
    live ? searchJobs(query) : searchCachedJobs(query, 120).then((jobs) => ({ jobs, sources: [] as { id: string; count: number; error?: string }[] })),
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("applications").select("id, job_id, status, match_score"),
  ]);
  const appByJob = new Map((apps ?? []).map((a) => [a.job_id, a]));
  const failed = sources.filter((s) => s.error);

  if (jobs.length === 0) {
    return (
      <EmptyState title={`No jobs found for “${q}”`}>
        Try a broader title, remove the location, or turn off “Remote only”.
        {failed.length > 0 && <p className="mt-2">Some sources didn’t respond: {failed.map((f) => f.id).join(", ")}.</p>}
      </EmptyState>
    );
  }

  const items: ResultItem[] = jobs.map((job, rank) => {
    const app = appByJob.get(job.id);
    const score = app?.match_score ?? (profile ? keywordMatch(profile as unknown as Profile, job).score : null);
    // Send only what a result card shows — descriptions stay on the server.
    const { id, title, company, company_logo, location, remote, salary_min, salary_max, salary_currency, salary_period, source, posted_at, tags } = job;
    return {
      job: { id, title, company, company_logo, location, remote, salary_min, salary_max, salary_currency, salary_period, source, posted_at, tags },
      score,
      applicationId: app?.id,
      status: app?.status,
      rank,
    };
  });

  return (
    <JobResults
      items={items}
      header={
        <>
          {failed.length > 0 && (
            <p className="text-xs text-muted">Unavailable right now: {failed.map((f) => f.id).join(", ")}</p>
          )}
          {!live && <Notice tone="warn">You searched a lot in the last few minutes, so these results come from our cache.</Notice>}
          {!profile?.skills?.length && (
            <Notice>
              Fit scores are rough until you{" "}
              <Link href="/profile" className="underline">
                add your resume
              </Link>
              .
            </Notice>
          )}
        </>
      }
    />
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <ProgressSteps
        active
        steps={[
          { label: "Searching Remotive, Himalayas, Jobicy and Remote OK", after: 0 },
          { label: "Checking company career pages on Greenhouse, Lever and Ashby", after: 3 },
          { label: "Removing duplicates and ranking the best matches", after: 9 },
          { label: "Some job boards are slow today — nearly there", after: 18 },
        ]}
      />
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="h-28 animate-pulse bg-surface-2/60" />
      ))}
    </div>
  );
}
