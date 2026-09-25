import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

// Landing point for OAuth, magic links and email confirmation (PKCE code exchange).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") || "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const site = publicEnv.siteUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${site}${next}`);
    return NextResponse.redirect(`${site}/login?error=${encodeURIComponent(error.message)}`);
  }

  const errorDescription = url.searchParams.get("error_description");
  return NextResponse.redirect(`${site}/login?error=${encodeURIComponent(errorDescription || "Sign-in link was invalid or expired.")}`);
}
