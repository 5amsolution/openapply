import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { enabledSources, type SearchQuery } from "@/lib/jobs/sources";
import { matchesLocation, tokens } from "@/lib/jobs/util";
import type { Job, JobInput } from "@/lib/types";

export interface SearchResult {
  jobs: Job[];
  sources: { id: string; count: number; error?: string }[];
}

const PER_SOURCE_TIMEOUT = 20_000;

/**
 * Live search across every enabled source, merged with matching jobs already
 * in the shared cache. New postings are upserted so other users (and the
 * autopilot) benefit from them.
 */
export async function searchJobs(q: SearchQuery & { sources?: string[] }, limit = 120): Promise<SearchResult> {
  const keywords = q.keywords.trim();
  if (!keywords) return { jobs: [], sources: [] };

  const sources = enabledSources().filter((s) => !q.sources?.length || q.sources.includes(s.id));

  const settled = await Promise.all(
    sources.map(async (s) => {
      try {
        const jobs = await withTimeout(s.search({ ...q, keywords }), PER_SOURCE_TIMEOUT);
        return { id: s.id, jobs };
      } catch (err) {
        return { id: s.id, jobs: [] as JobInput[], error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );

  let live = settled.flatMap((r) => r.jobs).filter((j) => j.url && j.title);
  if (q.remoteOnly) live = live.filter((j) => j.remote);
  if (q.location) live = live.filter((j) => matchesLocation(j, q.location!));
  live = dedupe(live);

  const stored = await upsertJobs(live);
  const cached = await searchCachedJobs(q, limit);

  const byId = new Map<string, Job>();
  for (const j of [...stored, ...cached]) byId.set(j.id, j);
  const jobs = rank([...byId.values()], keywords).slice(0, limit);

  return {
    jobs,
    sources: settled.map((r) => ({ id: r.id, count: r.jobs.length, ...(("error" in r && r.error) ? { error: r.error } : {}) })),
  };
}

/** Full-text search over jobs already stored (fast; used by autopilot and as a fallback). */
export async function searchCachedJobs(q: SearchQuery & { sources?: string[] }, limit = 100): Promise<Job[]> {
  const admin = createAdminClient();
  let query = admin
    .from("jobs")
    .select("*")
    .textSearch("search", q.keywords, { type: "websearch", config: "english" })
    .gte("fetched_at", new Date(Date.now() - 45 * 86_400_000).toISOString())
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(limit * 2);
  if (q.remoteOnly) query = query.eq("remote", true);
  if (q.sources?.length) query = query.in("source", q.sources);
  const { data, error } = await query;
  if (error) {
    console.error("searchCachedJobs", error.message);
    return [];
  }
  let jobs = (data ?? []) as Job[];
  if (q.location) jobs = jobs.filter((j) => matchesLocation(j, q.location!));
  return jobs.slice(0, limit);
}

export async function upsertJobs(jobs: JobInput[]): Promise<Job[]> {
  if (jobs.length === 0) return [];
  const admin = createAdminClient();
  const rows = jobs.map((j) => ({ ...j, description: j.description.slice(0, 60_000), fetched_at: new Date().toISOString() }));
  const out: Job[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await admin
      .from("jobs")
      .upsert(rows.slice(i, i + 200), { onConflict: "source,external_id" })
      .select("*");
    if (error) console.error("upsertJobs", error.message);
    else out.push(...((data ?? []) as Job[]));
  }
  return out;
}

function dedupe(jobs: JobInput[]): JobInput[] {
  const seen = new Map<string, JobInput>();
  for (const j of jobs) {
    const key = `${norm(j.title)}|${norm(j.company)}`;
    const prev = seen.get(key);
    // Prefer the richer description when the same posting appears on several boards.
    if (!prev || j.description.length > prev.description.length) seen.set(key, j);
  }
  // Also guard against duplicate (source, external_id) pairs, which would break the upsert.
  const bySourceId = new Map<string, JobInput>();
  for (const j of seen.values()) bySourceId.set(`${j.source}|${j.external_id}`, j);
  return [...bySourceId.values()];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Title matches first, then freshness. */
function rank(jobs: Job[], keywords: string): Job[] {
  const qt = tokens(keywords);
  const score = (j: Job) => {
    const title = j.title.toLowerCase();
    const titleHits = qt.filter((t) => title.includes(t)).length;
    const age = j.posted_at ? (Date.now() - new Date(j.posted_at).getTime()) / 86_400_000 : 60;
    return titleHits * 10 - Math.min(age, 60) / 6;
  };
  return jobs
    .map((j) => ({ j, s: score(j) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.j);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
