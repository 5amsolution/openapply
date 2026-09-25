import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import type { AIConfig, AIUsage, ProviderId } from "@/lib/ai/providers";
import type { AISettingsRow } from "@/lib/types";

export class MissingAIKeyError extends Error {
  constructor() {
    super("Add your own AI API key in Settings to use AI features.");
    this.name = "MissingAIKeyError";
  }
}

export class TokenLimitError extends Error {
  constructor(limit: number) {
    super(`You reached your monthly AI token limit (${limit.toLocaleString()}). Raise it in Settings.`);
    this.name = "TokenLimitError";
  }
}

/** Public view of a user's AI settings — never includes the key itself. */
export async function getAISettingsPublic(userId: string) {
  const { data } = await createAdminClient()
    .from("ai_settings")
    .select("provider, model, base_url, api_key_hint, monthly_token_limit, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data as Omit<AISettingsRow, "user_id" | "api_key_enc"> | null;
}

/** Loads and decrypts the user's key. Throws if they haven't set one or hit their cap. */
export async function getAIConfig(userId: string): Promise<AIConfig> {
  const admin = createAdminClient();
  const { data } = await admin.from("ai_settings").select("*").eq("user_id", userId).maybeSingle();
  const row = data as AISettingsRow | null;
  const needsKey = row?.provider !== "custom";
  if (!row || (needsKey && !row.api_key_enc)) throw new MissingAIKeyError();

  if (row.monthly_token_limit) {
    const used = await tokensThisMonth(userId);
    if (used >= row.monthly_token_limit) throw new TokenLimitError(row.monthly_token_limit);
  }

  return {
    provider: row.provider as ProviderId,
    model: row.model,
    baseUrl: row.base_url,
    apiKey: row.api_key_enc ? decrypt(row.api_key_enc) : "none",
  };
}

export async function hasAIConfig(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("ai_settings")
    .select("provider, api_key_enc")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data && (data.provider === "custom" || !!data.api_key_enc);
}

export async function recordUsage(userId: string, config: AIConfig, feature: string, usage: AIUsage) {
  await createAdminClient().from("ai_usage").insert({
    user_id: userId,
    feature,
    provider: config.provider,
    model: config.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
  });
}

export async function tokensThisMonth(userId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await createAdminClient()
    .from("ai_usage")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  return (data ?? []).reduce((sum, r) => sum + r.input_tokens + r.output_tokens, 0);
}
