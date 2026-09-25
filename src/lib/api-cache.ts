import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

// Shared (all users, all instances) cache and monthly budget for metered
// upstream APIs, so one free-tier key can serve a whole deployment.

export async function cacheGet<T>(key: string): Promise<T | null> {
  const { data } = await createAdminClient()
    .from("api_cache")
    .select("payload, expires_at")
    .eq("key", key)
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload as T;
}

export async function cacheSet(key: string, payload: unknown, ttlMs: number) {
  await createAdminClient()
    .from("api_cache")
    .upsert({ key, payload: payload as Json, expires_at: new Date(Date.now() + ttlMs).toISOString() });
}

/** Spends one request from this month's budget. False when the budget is used up. */
export async function consumeQuota(source: string, monthlyLimit: number): Promise<boolean> {
  const period = new Date().toISOString().slice(0, 7);
  const { data, error } = await createAdminClient().rpc("consume_api_quota", {
    p_source: source,
    p_period: period,
    p_limit: monthlyLimit,
  });
  if (error) {
    console.error("consumeQuota", error.message);
    return false;
  }
  return data === true;
}

export async function quotaUsed(source: string): Promise<number> {
  const period = new Date().toISOString().slice(0, 7);
  const { data } = await createAdminClient()
    .from("api_quota")
    .select("used")
    .eq("source", source)
    .eq("period", period)
    .maybeSingle();
  return data?.used ?? 0;
}
