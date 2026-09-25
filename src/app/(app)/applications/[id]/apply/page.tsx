import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { embeddableApplyUrl } from "@/lib/apply-embed";
import { ApplyWorkspace } from "@/components/apply-workspace";
import type { Application, Job, Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage(props: PageProps<"/applications/[id]/apply">) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from("applications").select("*, job:jobs(*)").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);
  if (!data || !data.job) notFound();
  const { job, ...app } = data as unknown as Application & { job: Job };
  const p = profile as unknown as Profile;

  return (
    <>
      <Link href={`/applications/${app.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft size={14} /> Back to application
      </Link>
      <ApplyWorkspace
        application={app}
        job={job}
        embedUrl={embeddableApplyUrl(job)}
        externalUrl={job.apply_url || job.url}
        profile={{
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          location: p.location,
          linkedin: p.links?.linkedin ?? null,
          github: p.links?.github ?? null,
          portfolio: p.links?.portfolio ?? null,
          salary_expectation: p.salary_expectation,
          notice_period: p.notice_period,
          work_authorization: p.work_authorization,
        }}
        resumeFilename={p.resume_path ? p.resume_filename : null}
      />
    </>
  );
}
