import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { enabledSources, type SearchQuery } from "@/lib/jobs/sources";
import { matchesLocation, tokens } from "@/lib/jobs/util";
import { getUserSourceKey } from "@/lib/source-keys";
import type { Job, JobInput } from "@/lib/types";
import type { TablesInsert } from "@/lib/database.types";

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

  // A signed-in user's own JSearch key (if any) switches that source on just for them.
  if (q.userId && q.jsearchUserKey === undefined) q = { ...q, jsearchUserKey: await getUserSourceKey(q.userId, "jsearch") };
  const sources = enabledSources(q).filter((s) => !q.sources?.length || q.sources.includes(s.id));
  // The shared cache is queried while the live sources are still answering.
  const t0 = Date.now();
  const cachedPromise = searchCachedJobs(q, limit).then((r) => {
    tCache = Date.now() - t0;
    return r;
  });
  let tCache = 0;

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

  const tSources = Date.now() - t0;
  let live = settled.flatMap((r) => r.jobs).filter((j) => j.url && j.title);
  if (q.remoteOnly) live = live.filter((j) => j.remote);
  if (q.location) live = live.filter((j) => matchesLocation(j, q.location!));
  // Only the best-ranked postings can make it onto the page, so only those get saved.
  live = rank(dedupe(live), keywords).slice(0, limit * 2);

  const t1 = Date.now();
  const [stored, cached] = await Promise.all([upsertJobs(live, q.userId), cachedPromise]);
  console.info(
    `[search] "${keywords}" sources ${tSources}ms (${settled.map((r) => `${r.id}:${r.jobs.length}`).join(" ")}) · save ${live.length} rows ${Date.now() - t1}ms · cache ${tCache}ms`,
  );

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
    .limit(limit + 40);
  if (q.remoteOnly) query = query.eq("remote", true);
  if (q.sources?.length) query = query.in("source", q.sources);
  query = q.userId ? query.or(`owner_id.is.null,owner_id.eq.${q.userId}`) : query.is("owner_id", null);
  const { data, error } = await query;
  if (error) {
    console.error("searchCachedJobs", error.message);
    return [];
  }
  let jobs = (data ?? []) as Job[];
  if (q.location) jobs = jobs.filter((j) => matchesLocation(j, q.location!));
  return jobs.slice(0, limit);
}

const REFRESH_AFTER_MS = 24 * 3_600_000;

/**
 * Saves postings and returns them with their database ids. Postings already
 * stored are reused as-is; only new ones are written before we answer, and
 * day-old ones are refreshed in the background.
 */
export async function upsertJobs(jobs: JobInput[], userId?: string): Promise<Job[]> {
  if (jobs.length === 0) return [];
  const admin = createAdminClient();
  const key = (j: { source: string; external_id: string }) => `${j.source}|${j.external_id}`;
  const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  // What do we already have?
  const known = new Map<string, { id: string; fetched_at: string; owner_id: string | null }>();
  const lookups = await Promise.all(
    chunk(jobs, 100).map((part) =>
      admin
        .from("jobs")
        .select("id, source, external_id, fetched_at, owner_id")
        .in("external_id", part.map((j) => j.external_id)),
    ),
  );
  for (const { data } of lookups) {
    for (const r of data ?? []) known.set(key(r), { id: r.id, fetched_at: r.fetched_at, owner_id: r.owner_id });
  }

  // Someone else's private posting that this search also found is public data
  // for both of them now — open it up so the link works for everyone who has it.
  const toPublish = jobs
    .map((j) => known.get(key(j)))
    .filter((k): k is NonNullable<typeof k> => !!k && !!k.owner_id && k.owner_id !== userId);
  if (toPublish.length) {
    await admin.from("jobs").update({ owner_id: null }).in("id", toPublish.map((k) => k.id));
    for (const k of toPublish) k.owner_id = null;
  }

  const fetchedAt = new Date().toISOString();
  const toRow = (j: JobInput) => ({ ...j, owner_id: j.owner_id ?? null, description: j.description.slice(0, 60_000), fetched_at: fetchedAt });
  // Refreshes must never flip a row's visibility, so they leave owner_id alone.
  const toRefreshRow = (j: JobInput) => {
    const { owner_id: _owner, ...rest } = toRow(j);
    void _owner;
    return rest;
  };
  const fresh = jobs.filter((j) => !known.has(key(j)));
  const stale = jobs.filter((j) => {
    const k = known.get(key(j));
    return k && Date.now() - new Date(k.fetched_at).getTime() > REFRESH_AFTER_MS;
  });

  const write = (rows: JobInput[], shape: (j: JobInput) => TablesInsert<"jobs"> = toRow) =>
    Promise.all(
      chunk(rows.map(shape), 100).map((part) =>
        admin.from("jobs").upsert(part, { onConflict: "source,external_id" }).select("id, source, external_id"),
      ),
    );

  // New postings need ids before we can link to them, so wait for those.
  for (const { data, error } of await write(fresh)) {
    if (error) console.error("upsertJobs", error.message);
    for (const r of data ?? []) {
      const own = jobs.find((j) => key(j) === key(r))?.owner_id ?? null;
      known.set(key(r), { id: r.id, fetched_at: fetchedAt, owner_id: own });
    }
  }
  // Old copies get refreshed without holding up the search.
  if (stale.length) void write(stale, toRefreshRow).catch((err) => console.error("refresh jobs", err));

  return jobs.flatMap((j) => {
    const k = known.get(key(j));
    return k ? [{ ...j, id: k.id, fetched_at: k.fetched_at, owner_id: k.owner_id } as Job] : [];
  });
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
function rank<T extends Pick<Job, "title" | "posted_at">>(jobs: T[], keywords: string): T[] {
  const qt = tokens(keywords);
  const score = (j: T) => {
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
