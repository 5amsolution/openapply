"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeJob, answerQuestions, draftForJob, saveJob } from "@/lib/applications";
import { runRule } from "@/lib/autopilot";
import { encrypt, keyHint, randomToken, sha256 } from "@/lib/crypto";
import { generateObject, PROVIDERS, type ProviderId } from "@/lib/ai/providers";
import { getAIConfig, hasAIConfig, recordUsage } from "@/lib/ai/settings";
import { parseResume } from "@/lib/ai/tasks";
import { extractResumeText, heuristicProfile } from "@/lib/resume";
import { APPLICATION_STATUSES, type Application, type AutopilotRule } from "@/lib/types";
import type { TablesUpdate } from "@/lib/database.types";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    // redirect() throws a special error that must propagate
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// ---------------------------------------------------------------------------
// Jobs & applications
// ---------------------------------------------------------------------------

export async function saveJobAction(jobId: string): Promise<ActionResult<Application>> {
  return attempt(async () => {
    const { user } = await requireUser();
    const app = await saveJob(user.id, jobId);
    revalidatePath("/applications");
    return app;
  });
}

export async function analyzeJobAction(jobId: string): Promise<ActionResult<Application>> {
  return attempt(async () => {
    const { user } = await requireUser();
    const app = await analyzeJob(user.id, jobId);
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/applications");
    return app;
  });
}

export async function draftApplicationAction(jobId: string, extraQuestions: string[] = []): Promise<ActionResult<Application>> {
  return attempt(async () => {
    const { user } = await requireUser();
    const existing = await createAdminClient()
      .from("applications")
      .select("match_score")
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .maybeSingle();
    if (existing.data?.match_score == null || !existing.data) await analyzeJob(user.id, jobId);
    const app = await draftForJob(user.id, jobId, { extraQuestions });
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/applications");
    return app;
  });
}

export async function answerQuestionsAction(applicationId: string, questions: string[]): Promise<ActionResult<Application>> {
  return attempt(async () => {
    const { user } = await requireUser();
    const cleaned = questions.map((q) => q.trim()).filter(Boolean).slice(0, 10);
    if (!cleaned.length) throw new Error("Add at least one question.");
    const app = await answerQuestions(user.id, applicationId, cleaned);
    revalidatePath(`/applications/${applicationId}`);
    return app;
  });
}

const ApplicationPatch = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  cover_letter: z.string().max(20_000).nullable().optional(),
  tailored_summary: z.string().max(5_000).nullable().optional(),
  notes: z.string().max(20_000).nullable().optional(),
  answers: z.array(z.object({ question: z.string().max(2000), answer: z.string().max(10_000) })).max(50).optional(),
});

export async function updateApplicationAction(id: string, patch: z.infer<typeof ApplicationPatch>): Promise<ActionResult> {
  return attempt(async () => {
    const { supabase } = await requireUser();
    const values: TablesUpdate<"applications"> = ApplicationPatch.parse(patch);
    if (values.status === "applied") values.applied_at = new Date().toISOString();
    const { error } = await supabase.from("applications").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/applications");
    revalidatePath(`/applications/${id}`);
    revalidatePath("/dashboard");
    return null;
  });
}

export async function deleteApplicationAction(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/applications");
    return null;
  });
}

// ---------------------------------------------------------------------------
// Profile & resume
// ---------------------------------------------------------------------------

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { supabase, user } = await requireUser();
    const str = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v || null;
    };
    const experience = JSON.parse(String(formData.get("experience") || "[]"));
    const education = JSON.parse(String(formData.get("education") || "[]"));
    const standardAnswers = JSON.parse(String(formData.get("standard_answers") || "{}"));
    const sponsorship = String(formData.get("needs_sponsorship") ?? "");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: str("full_name"),
        email: str("email"),
        phone: str("phone"),
        location: str("location"),
        headline: str("headline"),
        summary: str("summary"),
        links: {
          linkedin: str("linkedin") ?? "",
          github: str("github") ?? "",
          portfolio: str("portfolio") ?? "",
        },
        skills: lines(formData.get("skills")),
        desired_titles: lines(formData.get("desired_titles")),
        desired_locations: lines(formData.get("desired_locations")),
        remote_preference: z.enum(["any", "remote", "hybrid", "onsite"]).parse(formData.get("remote_preference") || "any"),
        work_authorization: str("work_authorization"),
        needs_sponsorship: sponsorship === "yes" ? true : sponsorship === "no" ? false : null,
        salary_expectation: str("salary_expectation"),
        notice_period: str("notice_period"),
        experience: z.array(z.record(z.string(), z.unknown())).max(40).parse(experience) as never,
        education: z.array(z.record(z.string(), z.unknown())).max(20).parse(education) as never,
        standard_answers: z.record(z.string(), z.string()).parse(standardAnswers),
        onboarded: true,
      })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return null;
  });
}

export async function uploadResumeAction(formData: FormData): Promise<ActionResult<{ parsedWithAI: boolean }>> {
  return attempt(async () => {
    const { supabase, user } = await requireUser();
    const file = formData.get("resume");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a resume file.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Resume must be under 10 MB.");

    const text = await extractResumeText(file);
    if (text.length < 100) throw new Error("Couldn't read text from that file. If it's a scanned PDF, upload a text-based PDF or DOCX.");

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${user.id}/resume.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: current } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const keep = (existing: string | null | undefined, incoming: string) => (existing && existing.trim() ? existing : incoming || null);

    const update: TablesUpdate<"profiles"> = { resume_text: text, resume_path: path, resume_filename: file.name };
    let parsedWithAI = false;

    if (await hasAIConfig(user.id)) {
      const config = await getAIConfig(user.id);
      const { data: parsed, usage } = await parseResume(config, text);
      await recordUsage(user.id, config, "resume", usage);
      parsedWithAI = true;
      Object.assign(update, {
        full_name: keep(current?.full_name, parsed.full_name),
        email: keep(current?.email, parsed.email),
        phone: keep(current?.phone, parsed.phone),
        location: keep(current?.location, parsed.location),
        headline: parsed.headline || current?.headline,
        summary: parsed.summary || current?.summary,
        links: { ...(current?.links as object), ...Object.fromEntries(Object.entries(parsed.links).filter(([, v]) => v)) },
        skills: parsed.skills.length ? parsed.skills : current?.skills,
        experience: parsed.experience,
        education: parsed.education,
        desired_titles: current?.desired_titles?.length ? current.desired_titles : parsed.desired_titles,
      });
    } else {
      const h = heuristicProfile(text);
      Object.assign(update, {
        full_name: keep(current?.full_name, h.full_name),
        email: keep(current?.email, h.email),
        phone: keep(current?.phone, h.phone),
        links: { ...(current?.links as object), ...(h.linkedin ? { linkedin: h.linkedin } : {}), ...(h.github ? { github: h.github } : {}) },
      });
    }

    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/profile");
    return { parsedWithAI };
  });
}

export async function resumeDownloadUrlAction(): Promise<ActionResult<string>> {
  return attempt(async () => {
    const { supabase, user } = await requireUser();
    const { data: profile } = await supabase.from("profiles").select("resume_path").eq("id", user.id).single();
    if (!profile?.resume_path) throw new Error("No resume uploaded.");
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(profile.resume_path, 300);
    if (error || !data) throw new Error(error?.message || "Could not create link");
    return data.signedUrl;
  });
}

// ---------------------------------------------------------------------------
// AI settings
// ---------------------------------------------------------------------------

const AISettingsInput = z.object({
  provider: z.enum(PROVIDERS.map((p) => p.id) as [ProviderId, ...ProviderId[]]),
  model: z.string().trim().min(1, "Choose a model").max(200),
  baseUrl: z.string().trim().max(500).optional(),
  apiKey: z.string().trim().max(500).optional(),
  monthlyTokenLimit: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
});

export async function saveAISettingsAction(input: z.infer<typeof AISettingsInput>): Promise<ActionResult> {
  return attempt(async () => {
    const { user } = await requireUser();
    const v = AISettingsInput.parse(input);
    if (v.baseUrl && !/^https?:\/\//.test(v.baseUrl)) throw new Error("Base URL must start with http:// or https://");
    const admin = createAdminClient();
    const { data: existing } = await admin.from("ai_settings").select("api_key_enc").eq("user_id", user.id).maybeSingle();
    if (!v.apiKey && !existing?.api_key_enc && v.provider !== "custom") throw new Error("Paste your API key.");

    const row = {
      user_id: user.id,
      provider: v.provider,
      model: v.model,
      base_url: v.baseUrl || null,
      monthly_token_limit: v.monthlyTokenLimit || null,
      ...(v.apiKey ? { api_key_enc: encrypt(v.apiKey), api_key_hint: keyHint(v.apiKey) } : {}),
    };
    const { error } = await admin.from("ai_settings").upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
    return null;
  });
}

export async function testAIKeyAction(): Promise<ActionResult<string>> {
  return attempt(async () => {
    const { user } = await requireUser();
    const config = await getAIConfig(user.id);
    const { data, usage } = await generateObject(config, {
      system: "You are a connectivity check.",
      prompt: 'Reply with {"ok": true}.',
      schema: z.object({ ok: z.boolean() }),
      maxTokens: 1000,
    });
    await recordUsage(user.id, config, "test", usage);
    if (!data.ok) throw new Error("Unexpected response from the model.");
    return `Connected to ${config.provider} · ${config.model}`;
  });
}

export async function removeAIKeyAction(): Promise<ActionResult> {
  return attempt(async () => {
    const { user } = await requireUser();
    await createAdminClient().from("ai_settings").delete().eq("user_id", user.id);
    revalidatePath("/settings");
    return null;
  });
}

// ---------------------------------------------------------------------------
// Browser extension tokens
// ---------------------------------------------------------------------------

export async function createExtensionTokenAction(label: string): Promise<ActionResult<string>> {
  return attempt(async () => {
    const { user } = await requireUser();
    const admin = createAdminClient();
    const { count } = await admin.from("extension_tokens").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= 10) throw new Error("You have 10 tokens already. Revoke one first.");
    const token = `oa_${randomToken(24)}`;
    const { error } = await admin
      .from("extension_tokens")
      .insert({ user_id: user.id, token_hash: sha256(token), label: label.trim().slice(0, 60) || "Browser extension" });
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
    return token;
  });
}

export async function revokeExtensionTokenAction(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const { user } = await requireUser();
    await createAdminClient().from("extension_tokens").delete().eq("id", id).eq("user_id", user.id);
    revalidatePath("/settings");
    return null;
  });
}

// ---------------------------------------------------------------------------
// Autopilot rules
// ---------------------------------------------------------------------------

const RuleInput = z.object({
  name: z.string().trim().min(1).max(80),
  keywords: z.string().trim().min(2, "Add search keywords").max(200),
  location: z.string().trim().max(120).default(""),
  remote_only: z.boolean().default(false),
  sources: z.array(z.string()).max(20).default([]),
  exclude_keywords: z.array(z.string().trim().max(60)).max(30).default([]),
  min_score: z.number().int().min(0).max(100).default(70),
  daily_limit: z.number().int().min(1).max(50).default(10),
  active: z.boolean().default(true),
});

export async function saveRuleAction(id: string | null, input: z.input<typeof RuleInput>): Promise<ActionResult<AutopilotRule>> {
  return attempt(async () => {
    const { supabase, user } = await requireUser();
    const v = RuleInput.parse(input);
    if (!id) {
      const { count } = await supabase.from("autopilot_rules").select("id", { count: "exact", head: true });
      if ((count ?? 0) >= 10) throw new Error("You can have up to 10 autopilot searches.");
    }
    const query = id
      ? supabase.from("autopilot_rules").update(v).eq("id", id)
      : supabase.from("autopilot_rules").insert({ ...v, user_id: user.id });
    const { data, error } = await query.select("*").single();
    if (error || !data) throw new Error(error?.message || "Could not save");
    revalidatePath("/autopilot");
    return data as AutopilotRule;
  });
}

export async function deleteRuleAction(id: string): Promise<ActionResult> {
  return attempt(async () => {
    const { supabase } = await requireUser();
    await supabase.from("autopilot_rules").delete().eq("id", id);
    revalidatePath("/autopilot");
    return null;
  });
}

export async function runRuleNowAction(id: string): Promise<ActionResult<{ draftsCreated: number; jobsScored: number; jobsFound: number; error?: string }>> {
  return attempt(async () => {
    const { supabase } = await requireUser();
    const { data: rule } = await supabase.from("autopilot_rules").select("*").eq("id", id).single();
    if (!rule) throw new Error("Rule not found");
    if (rule.last_run_at && Date.now() - new Date(rule.last_run_at).getTime() < 10 * 60_000) {
      throw new Error("This search ran less than 10 minutes ago. Give it a moment.");
    }
    const summary = await runRule(rule as AutopilotRule);
    revalidatePath("/autopilot");
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return summary;
  });
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function deleteAccountAction(confirmation: string): Promise<ActionResult> {
  return attempt(async () => {
    if (confirmation !== "DELETE") throw new Error('Type DELETE to confirm.');
    const { user } = await requireUser();
    const admin = createAdminClient();
    const { data: files } = await admin.storage.from("resumes").list(user.id);
    if (files?.length) await admin.storage.from("resumes").remove(files.map((f) => `${user.id}/${f.name}`));
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(error.message);
    redirect("/");
  });
}
