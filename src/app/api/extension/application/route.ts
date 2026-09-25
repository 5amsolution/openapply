import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateExtension, corsPreflight, json } from "@/lib/extension-auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * GET ?url=<current tab url>  → the application whose job lives at that URL (if any),
 * plus the user's "ready" applications so they can pick one manually.
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateExtension(request);
  if (!userId) return json({ error: "Invalid or revoked token" }, 401);

  const pageUrl = request.nextUrl.searchParams.get("url") || "";
  const admin = createAdminClient();
  const { data } = await admin
    .from("applications")
    .select("id, status, cover_letter, tailored_summary, answers, job:jobs(id, title, company, url, apply_url)")
    .eq("user_id", userId)
    .in("status", ["saved", "ready", "applied"])
    .order("updated_at", { ascending: false })
    .limit(100);

  type Row = NonNullable<typeof data>[number] & {
    job: { id: string; title: string; company: string; url: string; apply_url: string | null } | null;
  };
  const apps = (data ?? []) as Row[];
  const target = normalize(pageUrl);
  const match =
    (target &&
      apps.find((a) => a.job && [a.job.apply_url, a.job.url].some((u) => u && sameJob(normalize(u), target)))) ||
    null;

  const shape = (a: Row) => ({
    id: a.id,
    status: a.status,
    title: a.job?.title,
    company: a.job?.company,
    cover_letter: a.cover_letter,
    tailored_summary: a.tailored_summary,
    answers: a.answers,
    job_url: a.job?.apply_url || a.job?.url,
  });

  return json({
    match: match ? shape(match) : null,
    ready: apps.filter((a) => a.status === "ready" && a.cover_letter).slice(0, 30).map(shape),
  });
}

/** POST { id } — mark an application as applied after the user submits. */
export async function POST(request: NextRequest) {
  const userId = await authenticateExtension(request);
  if (!userId) return json({ error: "Invalid or revoked token" }, 401);
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return json({ error: "id required" }, 400);
  const { error } = await createAdminClient()
    .from("applications")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("user_id", userId);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}

function normalize(u: string): string {
  try {
    const url = new URL(u);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/(application|apply)\/?$/, "").replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return "";
  }
}

function sameJob(a: string, b: string): boolean {
  return a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
}
