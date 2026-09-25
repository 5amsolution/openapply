import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateExtension, corsPreflight, json } from "@/lib/extension-auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

/** Everything the extension needs to fill a generic application form. */
export async function GET(request: NextRequest) {
  const userId = await authenticateExtension(request);
  if (!userId) return json({ error: "Invalid or revoked token" }, 401);

  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("*").eq("id", userId).single();
  if (!p) return json({ error: "Profile not found" }, 404);

  let resume: { url: string; filename: string } | null = null;
  if (p.resume_path) {
    const { data } = await admin.storage.from("resumes").createSignedUrl(p.resume_path, 600);
    if (data) resume = { url: data.signedUrl, filename: p.resume_filename || "resume.pdf" };
  }

  const [first, ...rest] = (p.full_name || "").trim().split(/\s+/);
  const experience = (p.experience as { title?: string; company?: string }[] | null) ?? [];
  const education = (p.education as { school?: string; degree?: string; field?: string; end?: string }[] | null) ?? [];

  return json({
    profile: {
      full_name: p.full_name,
      first_name: first || "",
      last_name: rest.join(" "),
      email: p.email,
      phone: p.phone,
      location: p.location,
      headline: p.headline,
      summary: p.summary,
      links: p.links,
      current_title: experience[0]?.title ?? p.headline ?? "",
      current_company: experience[0]?.company ?? "",
      school: education[0]?.school ?? "",
      degree: education[0]?.degree ?? "",
      field_of_study: education[0]?.field ?? "",
      graduation_year: education[0]?.end ?? "",
      work_authorization: p.work_authorization,
      needs_sponsorship: p.needs_sponsorship,
      salary_expectation: p.salary_expectation,
      notice_period: p.notice_period,
      standard_answers: p.standard_answers,
    },
    resume,
  });
}
