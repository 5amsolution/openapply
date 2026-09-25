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

export async function runRule(rule: AutopilotRule): Promise<RunSummary> {
  const admin = createAdminClient();
  const { data: run } = await admin
    .from("agent_runs")
    .insert({ user_id: rule.user_id, rule_id: rule.id })
    .select("id")
    .single();

  const summary: RunSummary = { ruleId: rule.id, jobsFound: 0, jobsScored: 0, draftsCreated: 0 };
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
    .eq("id", run?.id ?? "");
  await admin.from("autopilot_rules").update({ last_run_at: new Date().toISOString() }).eq("id", rule.id);
  return summary;
}

/** Runs every active rule that hasn't run in the last ~day. Called by the cron endpoint. */
export async function runDueRules(maxRules = 25): Promise<RunSummary[]> {
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
