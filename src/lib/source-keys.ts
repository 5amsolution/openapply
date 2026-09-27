import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { quotaUsed } from "@/lib/api-cache";

// Users' own keys for metered job sources.

export const SOURCE_KEY_IDS = ["jsearch", "remoterocketship"] as const;
export type SourceKeyId = (typeof SOURCE_KEY_IDS)[number];

export interface UserSourceKey {
  key: string;
  monthlyLimit: number;
}

export type UserSourceKeys = Partial<Record<SourceKeyId, UserSourceKey>>;

export async function getUserSourceKey(userId: string, source: SourceKeyId): Promise<UserSourceKey | null> {
  return (await getUserSourceKeys(userId))[source] ?? null;
}

/** Every key this user has saved, decrypted (server-only). */
export async function getUserSourceKeys(userId: string): Promise<UserSourceKeys> {
  const { data } = await createAdminClient().from("source_keys").select("source, key_enc, monthly_limit").eq("user_id", userId);
  const out: UserSourceKeys = {};
  for (const row of data ?? []) {
    try {
      out[row.source as SourceKeyId] = { key: decrypt(row.key_enc), monthlyLimit: row.monthly_limit };
    } catch {
      // A key that no longer decrypts is treated as missing.
    }
  }
  return out;
}

/** Which sources this user has their own key for (never the keys themselves). */
export async function getUserSourceKeyIds(userId: string): Promise<SourceKeyId[]> {
  const { data } = await createAdminClient().from("source_keys").select("source").eq("user_id", userId);
  return (data ?? []).map((r) => r.source as SourceKeyId);
}

/** Public view for Settings (never includes the key). */
export async function getUserSourceKeyInfo(userId: string, source: SourceKeyId) {
  const { data } = await createAdminClient()
    .from("source_keys")
    .select("key_hint, monthly_limit, updated_at")
    .eq("user_id", userId)
    .eq("source", source)
    .maybeSingle();
  if (!data) return null;
  return { ...data, usedThisMonth: await quotaUsed(userQuotaSource(source, userId)) };
}

/** Quota and cache bucket for a user's own key (kept apart from the site-wide key). */
export function userQuotaSource(source: SourceKeyId, userId: string) {
  return `${source}:u:${userId}`;
}
