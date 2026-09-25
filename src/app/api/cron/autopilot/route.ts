import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDueRules } from "@/lib/autopilot";
import { serverEnv } from "@/lib/env";

// Called by the scheduler (scripts/cron.mjs on a Railway cron service).
// Processes a small batch per call; the caller repeats until `processed` is 0.
export const maxDuration = 800;

export async function POST(request: NextRequest) {
  const secret = serverEnv.cronSecret();
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const batch = Math.min(Number(request.nextUrl.searchParams.get("batch")) || 5, 25);
  const results = await runDueRules(batch);
  return NextResponse.json({
    processed: results.length,
    drafts: results.reduce((s, r) => s + r.draftsCreated, 0),
    errors: results.filter((r) => r.error).length,
  });
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
