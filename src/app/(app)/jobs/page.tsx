import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/server";
import { searchCachedJobs, searchJobs } from "@/lib/jobs/search";
import { allow } from "@/lib/rate-limit";
import { enabledSources } from "@/lib/jobs/sources";
import { getUserSourceKeyInfo } from "@/lib/source-keys";
import { keywordMatch } from "@/lib/matching";
import { Button, Card, EmptyState, Input, Notice, PageHeader } from "@/components/ui";
import { JobCard } from "@/components/job-card";
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
      <PageHeader title="Find jobs" description={`Searching ${sources.length} job sources at once.`} />

      <Card className="mb-6 p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_16rem_auto_auto]" action="/jobs">
          <Input name="q" defaultValue={q} placeholder="Job title, skill or company — e.g. product designer" required aria-label="Keywords" />
          <Input
            name="loc"
            defaultValue={loc || (q ? "" : profile?.desired_locations?.[0] ?? "")}
            placeholder="Location (optional)"
            aria-label="Location"
          />
          <label className="flex items-center gap-2 px-1 text-sm">
            <input
              type="checkbox"
              name="remote"
              value="1"
              defaultChecked={remote || (!q && profile?.remote_preference === "remote")}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Remote only
          </label>
          <Button type="submit">Search</Button>
          <details className="md:col-span-4">
            <summary className="cursor-pointer text-sm text-muted">Sources ({src.length ? src.length : "all"})</summary>
            <SourceFilter sources={sources} selected={src} />
          </details>
        </form>
        {!q && suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Try:</span>
            {suggestions.slice(0, 5).map((t) => (
              <Link
                key={t}
                href={`/jobs?q=${encodeURIComponent(t)}${profile?.remote_preference === "remote" ? "&remote=1" : ""}`}
                className="rounded-md bg-surface-2 px-2 py-1 hover:text-accent"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
      </Card>

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

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>
          {jobs.length} jobs · sorted by relevance
        </span>
        {failed.length > 0 && <span>Unavailable right now: {failed.map((f) => f.id).join(", ")}</span>}
      </div>
      {!live && <Notice tone="warn">You searched a lot in the last few minutes, so these results come from our cache.</Notice>}
      {!profile?.skills?.length && (
        <Notice>
          Fit scores are rough until you <Link href="/profile" className="underline">add your resume</Link>.
        </Notice>
      )}
      {jobs.map((job) => {
        const app = appByJob.get(job.id);
        const estimate = app?.match_score ?? (profile ? keywordMatch(profile as unknown as Profile, job).score : null);
        return <JobCard key={job.id} job={job} score={estimate} applicationId={app?.id} status={app?.status} />;
      })}
    </div>
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
