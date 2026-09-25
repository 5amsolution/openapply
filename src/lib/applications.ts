import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIConfig, recordUsage } from "@/lib/ai/settings";
import { draftApplication, scoreMatch } from "@/lib/ai/tasks";
import type { AIConfig } from "@/lib/ai/providers";
import { keywordMatch } from "@/lib/matching";
import type { Application, Job, Profile } from "@/lib/types";

// Server-side operations on a user's applications. Callers must pass a user
// id they have already authenticated; these use the service-role client.

export async function loadProfile(userId: string): Promise<Profile> {
  const { data, error } = await createAdminClient().from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error("Profile not found");
  return data as unknown as Profile;
}

export async function loadJob(jobId: string): Promise<Job> {
  const { data, error } = await createAdminClient().from("jobs").select("*").eq("id", jobId).single();
  if (error || !data) throw new Error("Job not found");
  return data as Job;
}

async function getApplication(userId: string, jobId: string): Promise<Application | null> {
  const { data } = await createAdminClient()
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();
  return (data as Application | null) ?? null;
}

async function upsertApplication(userId: string, jobId: string, patch: Partial<Application>): Promise<Application> {
  const { data, error } = await createAdminClient()
    .from("applications")
    .upsert({ user_id: userId, job_id: jobId, ...patch }, { onConflict: "user_id,job_id" })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not save application");
  return data as Application;
}

export async function saveJob(userId: string, jobId: string): Promise<Application> {
  const existing = await getApplication(userId, jobId);
  if (existing) return existing;
  const [profile, job] = await Promise.all([loadProfile(userId), loadJob(jobId)]);
  const km = keywordMatch(profile, job);
  return upsertApplication(userId, jobId, {
    status: "saved",
    match_score: km.score,
    match_summary: km.summary,
    match_strengths: km.strengths,
    match_gaps: km.gaps,
  });
}

/** AI fit analysis. Creates the application row (status "saved") if needed. */
export async function analyzeJob(userId: string, jobId: string, config?: AIConfig) {
  const cfg = config ?? (await getAIConfig(userId));
  const [profile, job] = await Promise.all([loadProfile(userId), loadJob(jobId)]);
  const { data, usage } = await scoreMatch(cfg, profile, job);
  await recordUsage(userId, cfg, "match", usage);
  const existing = await getApplication(userId, jobId);
  const gaps = data.dealbreaker ? [data.dealbreaker, ...data.gaps] : data.gaps;
  return upsertApplication(userId, jobId, {
    status: existing?.status ?? "saved",
    match_score: data.dealbreaker ? Math.min(data.score, 40) : data.score,
    match_summary: data.summary,
    match_strengths: data.strengths.slice(0, 6),
    match_gaps: gaps.slice(0, 6),
  });
}

/** Writes the cover letter, tailored resume points and screening answers. */
export async function draftForJob(
  userId: string,
  jobId: string,
  opts: { config?: AIConfig; extraQuestions?: string[]; origin?: "manual" | "autopilot"; ruleId?: string } = {},
) {
  const cfg = opts.config ?? (await getAIConfig(userId));
  const [profile, job] = await Promise.all([loadProfile(userId), loadJob(jobId)]);
  const { data, usage } = await draftApplication(cfg, profile, job, opts.extraQuestions);
  await recordUsage(userId, cfg, "draft", usage);
  const existing = await getApplication(userId, jobId);
  const keepStatus = existing && !["saved", "ready"].includes(existing.status);
  return upsertApplication(userId, jobId, {
    status: keepStatus ? existing!.status : "ready",
    origin: existing?.origin ?? opts.origin ?? "manual",
    rule_id: existing?.rule_id ?? opts.ruleId ?? null,
    cover_letter: data.cover_letter,
    tailored_summary: data.tailored_summary,
    tailored_bullets: data.tailored_bullets,
    answers: data.answers,
  });
}

export async function answerQuestions(userId: string, applicationId: string, questions: string[]) {
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .single();
  if (!app) throw new Error("Application not found");
  const cfg = await getAIConfig(userId);
  const [profile, job] = await Promise.all([loadProfile(userId), loadJob(app.job_id)]);
  const { data, usage } = await draftApplication(cfg, profile, job, questions);
  await recordUsage(userId, cfg, "answers", usage);
  const wanted = new Set(questions.map((q) => q.trim().toLowerCase()));
  const fresh = data.answers.filter((a) => wanted.has(a.question.trim().toLowerCase()));
  const answers = [
    ...((app.answers as Application["answers"]) ?? []).filter((a) => !wanted.has(a.question.trim().toLowerCase())),
    ...(fresh.length ? fresh : data.answers.slice(-questions.length)),
  ];
  const { data: updated } = await admin
    .from("applications")
    .update({ answers })
    .eq("id", applicationId)
    .select("*")
    .single();
  return updated as Application;
}
