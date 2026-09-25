import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, keyHint } from "@/lib/crypto";
import { publicEnv } from "@/lib/env";
import { DEFAULT_OPENROUTER_MODEL } from "@/lib/ai/providers";

// Step 2 of "Connect with OpenRouter": swap the one-time code for a key that
// belongs to the user's own OpenRouter account, and store it encrypted.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const site = publicEnv.siteUrl();
  const done = (status: string, message?: string) => {
    const url = new URL(`${site}/settings`);
    url.searchParams.set("openrouter", status);
    if (message) url.searchParams.set("message", message.slice(0, 200));
    const res = NextResponse.redirect(url.toString());
    res.cookies.delete({ name: "or_pkce", path: "/api/openrouter" });
    return res;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/login?next=/settings`);

  const code = request.nextUrl.searchParams.get("code");
  const verifier = request.cookies.get("or_pkce")?.value;
  if (!code) return done("error", "OpenRouter didn't send an authorization code. Please try again.");
  if (!verifier) return done("error", "The connection timed out. Please click Connect again.");

  let key: string | undefined;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json().catch(() => ({}))) as { key?: string; error?: { message?: string } | string };
    if (!res.ok || !body.key) {
      const msg = typeof body.error === "string" ? body.error : body.error?.message;
      return done("error", `OpenRouter didn't accept the approval (${msg || res.status}). It may have expired — please click Connect again.`);
    }
    key = body.key;
  } catch {
    return done("error", "Couldn't reach OpenRouter. Please try again.");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("ai_settings").select("provider, model").eq("user_id", user.id).maybeSingle();
  const model = existing?.provider === "openrouter" && existing.model ? existing.model : DEFAULT_OPENROUTER_MODEL;

  const { error } = await admin.from("ai_settings").upsert(
    {
      user_id: user.id,
      provider: "openrouter",
      model,
      base_url: null,
      api_key_enc: encrypt(key),
      api_key_hint: keyHint(key),
      connected_via: "oauth",
    },
    { onConflict: "user_id" },
  );
  if (error) return done("error", error.message);
  return done("connected");
}
