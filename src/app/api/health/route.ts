import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await createAdminClient().from("jobs").select("id", { head: true, count: "exact" }).limit(1);
  return NextResponse.json({ ok: !error, db: error ? error.message : "ok" }, { status: error ? 503 : 200 });
}
