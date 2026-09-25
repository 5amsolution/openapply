import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { enabledSources } from "@/lib/jobs/sources";
import { serverEnv } from "@/lib/env";
import { closeInterruptedRuns } from "@/lib/autopilot";

// Pre-loads the big whole-board sources (company career pages, Remote OK) into
// this server's in-memory cache, so the first real search after a deploy is fast.
// Called by the built-in scheduler in instrumentation.ts.

const WARM = new Set(["greenhouse", "lever", "ashby", "remoteok", "arbeitnow"]);

export async function POST(request: NextRequest) {
  const secret = serverEnv.cronSecret();
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  if (!secret || given.length !== Buffer.byteLength(secret) || !timingSafeEqual(given, Buffer.from(secret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // On boot, any unfinished autopilot run belonged to the previous (stopped) server.
  if (request.nextUrl.searchParams.get("boot") === "1") await closeInterruptedRuns({ all: true });
  const started = Date.now();
  const results = await Promise.allSettled(
    enabledSources()
      .filter((s) => WARM.has(s.id))
      .map(async (s) => ({ id: s.id, n: (await s.search({ keywords: "engineer" })).length })),
  );
  return NextResponse.json({
    ms: Date.now() - started,
    sources: results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) })),
  });
}
