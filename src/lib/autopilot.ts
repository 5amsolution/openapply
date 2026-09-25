import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIConfig, MissingAIKeyError, TokenLimitError } from "@/lib/ai/settings";
import { analyzeJob, draftForJob, loadProfile } from "@/lib/applications";
import { searchJobs } from "@/lib/jobs/search";
import { keywordMatch } from "@/lib/matching";
import type { AutopilotRule, Job } from "@/lib/types";

// The autopilot: for each active rule, find new jobs, pre-filter them with the
// free keyword matcher, have the user's AI score the best candidates, and
// write full application packages for the ones above the rule's threshold.
// Packages land in the "Ready to apply" column — submitting stays with the
// user (one click with the browser extension), because job boards forbid
// automated submissions and most require a human-verified form anyway.

export interface RunSummary {
  ruleId: string;
  jobsFound: number;
  jobsScored: number;
  draftsCreated: number;
  error?: string;
}

const MIN_HOURS_BETWEEN_RUNS = 20;
/** A run with no finish after this long died with its server (deploy/restart). */
const STALE_RUN_MS = 45 * 60_000;

/** Creates the run record and does the work in the background; returns the run id at once. */
export async function startRuleRun(rule: AutopilotRule): Promise<string> {
  const admin = createAdminClient();
  const { data: run, error } = await admin
    .from("agent_runs")
    .insert({ user_id: rule.user_id, rule_id: rule.id })
    .select("id")
    .single();
  if (error || !run) throw new Error(error?.message || "Could not start the run");
  void runRule(rule, run.id).catch((err) => console.error("[autopilot] background run failed", err));
  return run.id;
}

/** Marks runs that never finished (their server stopped) as interrupted. */
export async function closeInterruptedRuns(opts: { all?: boolean; userId?: string } = {}) {
  let q = createAdminClient()
    .from("agent_runs")
    .update({ finished_at: new Date().toISOString(), error: "Interrupted — the server restarted. Run it again." })
    .is("finished_at", null);
  if (!opts.all) q = q.lt("started_at", new Date(Date.now() - STALE_RUN_MS).toISOString());
  if (opts.userId) q = q.eq("user_id", opts.userId);
  await q;
}

export async function runRule(rule: AutopilotRule, existingRunId?: string): Promise<RunSummary> {
  const admin = createAdminClient();
  let runId = existingRunId;
  if (!runId) {
    const { data: run } = await admin
      .from("agent_runs")
      .insert({ user_id: rule.user_id, rule_id: rule.id })
      .select("id")
      .single();
    runId = run?.id;
  }

  const summary: RunSummary = { ruleId: rule.id, jobsFound: 0, jobsScored: 0, draftsCreated: 0 };
  // Progress is saved as we go, so the page can show it live and nothing is lost if the server stops.
  const progress = () =>
    admin
      .from("agent_runs")
      .update({ jobs_found: summary.jobsFound, jobs_scored: summary.jobsScored, drafts_created: summary.draftsCreated })
      .eq("id", runId ?? "");

  try {
    const config = await getAIConfig(rule.user_id);
    const profile = await loadProfile(rule.user_id);

    const { jobs } = await searchJobs({
      keywords: rule.keywords,
      location: rule.location || undefined,
      remoteOnly: rule.remote_only,
      sources: rule.sources.length ? rule.sources : undefined,
      cacheOnly: true,
      userId: rule.user_id,
    });

    const { data: existing } = await admin.from("applications").select("job_id").eq("user_id", rule.user_id);
    const seen = new Set((existing ?? []).map((a) => a.job_id as string));
    const excluded = rule.exclude_keywords.map((k) => k.toLowerCase()).filter(Boolean);

    const fresh = jobs.filter((j: Job) => {
      if (seen.has(j.id)) return false;
      const hay = `${j.title} ${j.company}`.toLowerCase();
      return !excluded.some((k) => hay.includes(k));
    });
    summary.jobsFound = fresh.length;
    await progress();

    // Spend tokens on the most promising jobs only.
    const candidates = fresh
      .map((j) => ({ j, k: keywordMatch(profile, j).score }))
      .sort((a, b) => b.k - a.k)
      .slice(0, rule.daily_limit * 2)
      .map((x) => x.j);

    for (const job of candidates) {
      if (summary.draftsCreated >= rule.daily_limit) break;
      const app = await analyzeJob(rule.user_id, job.id, config);
      summary.jobsScored++;
      await admin.from("applications").update({ origin: "autopilot", rule_id: rule.id }).eq("id", app.id);
      if ((app.match_score ?? 0) >= rule.min_score) {
        await draftForJob(rule.user_id, job.id, { config, origin: "autopilot", ruleId: rule.id });
        summary.draftsCreated++;
      } else {
        // Keep low scorers out of the board but remember we've seen them.
        await admin.from("applications").update({ status: "archived" }).eq("id", app.id);
      }
      await progress();
    }
  } catch (err) {
    summary.error =
      err instanceof MissingAIKeyError || err instanceof TokenLimitError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
  }

  await admin
    .from("agent_runs")
    .update({
      finished_at: new Date().toISOString(),
      jobs_found: summary.jobsFound,
      jobs_scored: summary.jobsScored,
      drafts_created: summary.draftsCreated,
      error: summary.error ?? null,
    })
    .eq("id", runId ?? "");
  await admin.from("autopilot_rules").update({ last_run_at: new Date().toISOString() }).eq("id", rule.id);
  return summary;
}

/** Runs every active rule that hasn't run in the last ~day. Called by the cron endpoint. */
export async function runDueRules(maxRules = 25): Promise<RunSummary[]> {
  await closeInterruptedRuns();
  const cutoff = new Date(Date.now() - MIN_HOURS_BETWEEN_RUNS * 3_600_000).toISOString();
  const { data } = await createAdminClient()
    .from("autopilot_rules")
    .select("*")
    .eq("active", true)
    .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`)
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(maxRules);

  const results: RunSummary[] = [];
  for (const rule of (data ?? []) as AutopilotRule[]) {
    results.push(await runRule(rule));
  }
  return results;
}
