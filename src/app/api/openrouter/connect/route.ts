import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

// Step 1 of "Connect with OpenRouter" (OAuth PKCE): send the user to
// OpenRouter to approve a key for OpenApply. The verifier waits in a
// short-lived httpOnly cookie until OpenRouter redirects back.

export const dynamic = "force-dynamic";

export async function GET() {
  const site = publicEnv.siteUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/login?next=/settings`);

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const auth = new URL("https://openrouter.ai/auth");
  auth.searchParams.set("callback_url", `${site}/api/openrouter/callback`);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("code_challenge_method", "S256");
  auth.searchParams.set("key_label", "OpenApply");

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set("or_pkce", verifier, {
    httpOnly: true,
    secure: site.startsWith("https://"),
    sameSite: "lax",
    path: "/api/openrouter",
    maxAge: 600,
  });
  return res;
}
