import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { ApplicationEditor } from "@/components/application-editor";
import type { Application, Job } from "@/lib/types";

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationPage(props: PageProps<"/applications/[id]">) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();
  const [{ data }, { data: profile }, aiReady] = await Promise.all([
    supabase.from("applications").select("*, job:jobs(*)").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("resume_path, resume_filename").eq("id", user.id).single(),
    hasAIConfig(user.id),
  ]);
  if (!data || !data.job) notFound();
  const { job, ...app } = data as unknown as Application & { job: Job };

  return (
    <>
      <Link href="/applications" className="mb-5 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm font-semibold text-muted transition-colors hover:text-fg">
        <ArrowLeft size={16} aria-hidden="true" /> All applications
      </Link>
      <ApplicationEditor
        application={app}
        job={job}
        aiReady={aiReady}
        resumeFilename={profile?.resume_path ? profile.resume_filename : null}
      />
    </>
  );
}
