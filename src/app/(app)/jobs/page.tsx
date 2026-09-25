import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/server";
import { searchCachedJobs, searchJobs } from "@/lib/jobs/search";
import { allow } from "@/lib/rate-limit";
import { enabledSources } from "@/lib/jobs/sources";
import { getUserSourceKeyInfo } from "@/lib/source-keys";
import { keywordMatch } from "@/lib/matching";
import { Button, Card, EmptyState, Input, Notice, PageHeader, Switch } from "@/components/ui";
import { ChevronDown, Layers, MapPin, Radar, Search, SearchX, Sparkles } from "lucide-react";
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
  const suggestions = profile?.desired_titles?.length ? profile.desired_titles : POPULAR;

  return (
    <>
      <PageHeader
        icon={<Search size={22} />}
        eyebrow={
          <>
            <Radar size={14} aria-hidden="true" /> {sources.length} job sources, searched live
          </>
        }
        title="Find jobs"
        description="One search across remote job boards and top company career pages. Every result is scored against your resume."
      />

      <Card className="mb-6 p-3 shadow-sm sm:p-4">
        <form className="grid gap-3" action="/jobs" role="search">
          <div className="flex flex-col gap-2.5 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                name="q"
                defaultValue={q}
                required
                aria-label="Job title, skill or company"
                placeholder="Job title, skill or company, e.g. product designer"
                className="h-12 pl-11 text-base"
              />
            </div>
            <div className="relative lg:w-64">
              <MapPin size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                name="loc"
                defaultValue={loc || (q ? "" : profile?.desired_locations?.[0] ?? "")}
                aria-label="Location"
                placeholder="Location (optional)"
                className="h-12 pl-11 text-base"
              />
            </div>
            <Button type="submit" size="lg" className="lg:px-8">
              <Search size={17} aria-hidden="true" /> Search
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-1 pt-1">
            <Switch name="remote" value="1" defaultChecked={remote || (!q && profile?.remote_preference === "remote")} label="Remote only" />
            <details className="group/src w-full sm:w-auto">
              <summary className="inline-flex h-9 list-none items-center gap-1.5 rounded-lg text-sm font-semibold text-muted hover:text-fg">
                <Layers size={15} aria-hidden="true" /> Sources: {src.length ? `${src.length} selected` : "all"}
                <ChevronDown size={15} aria-hidden="true" className="transition-transform group-open/src:rotate-180" />
              </summary>
              <SourceFilter sources={sources} selected={src} />
            </details>
          </div>
        </form>
      </Card>

      {q ? (
        <Suspense key={`${q}|${loc}|${remote}|${src.join(",")}`} fallback={<ResultsSkeleton />}>
          <Results userId={user.id} q={q} loc={loc} remote={remote} src={src} />
        </Suspense>
      ) : (
        <EmptyState
          icon={<Sparkles size={22} />}
          title="Search for a role to get started"
          action={suggestions.slice(0, 5).map((t) => (
            <Link
              key={t}
              href={`/jobs?q=${encodeURIComponent(t)}${profile?.remote_preference === "remote" ? "&remote=1" : ""}`}
              className="inline-flex h-9 items-center rounded-full border border-border-strong bg-surface px-3.5 text-[13px] font-semibold text-fg transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-soft-fg"
            >
              {t}
            </Link>
          ))}
        >
          Results come from public job boards and company career pages, and every job links back to its original posting.
          {profile?.desired_titles?.length ? " Try one of your target roles:" : " Popular searches:"}
        </EmptyState>
      )}
    </>
  );
}

const POPULAR = ["Frontend developer", "Product designer", "Data analyst", "Customer support", "Marketing manager"];

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
      <EmptyState icon={<SearchX size={22} />} title={`No jobs found for “${q}”`}>
        Try a broader title, remove the location, or turn off “Remote only”.
        {failed.length > 0 && <p className="mt-2">Some sources didn’t respond: {failed.map((f) => f.id).join(", ")}.</p>}
      </EmptyState>
    );
  }

  const items: ResultItem[] = jobs.map((job, rank) => {
    const app = appByJob.get(job.id);
    const score = app?.match_score ?? (profile ? keywordMatch(profile as unknown as Profile, job).score : null);
    // Send only what a result card shows, descriptions stay on the server.
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
              Fit scores are rough until you <Link href="/profile">add your resume</Link>.
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
          { label: "Some job boards are slow today. Nearly there", after: 18 },
        ]}
      />
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="flex gap-4 p-5">
          <div className="skeleton h-12 w-12 rounded-xl" />
          <div className="grid flex-1 content-start gap-2.5">
            <div className="skeleton h-4 w-2/3 rounded-md" />
            <div className="skeleton h-3.5 w-1/3 rounded-md" />
            <div className="skeleton mt-1 h-3 w-1/2 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}
