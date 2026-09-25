import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { quotaUsed } from "@/lib/api-cache";

// Users' own keys for metered job sources. Only JSearch for now.

export type SourceKeyId = "jsearch";

export interface UserSourceKey {
  key: string;
  monthlyLimit: number;
}

export async function getUserSourceKey(userId: string, source: SourceKeyId): Promise<UserSourceKey | null> {
  const { data } = await createAdminClient()
    .from("source_keys")
    .select("key_enc, monthly_limit")
    .eq("user_id", userId)
    .eq("source", source)
    .maybeSingle();
  if (!data) return null;
  try {
    return { key: decrypt(data.key_enc), monthlyLimit: data.monthly_limit };
  } catch {
    return null;
  }
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
