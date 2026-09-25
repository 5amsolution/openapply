import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client. Bypasses RLS — only use on the server, and always
 * scope queries to a user id you have already authenticated.
 */
export function createAdminClient() {
  if (!cached) {
    cached = createClient<Database>(publicEnv.supabaseUrl(), serverEnv.serviceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
