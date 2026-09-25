import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Wallet } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { keywordMatch } from "@/lib/matching";
import { Badge, Card } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import { JobAIPanel } from "@/components/job-ai-panel";
import { formatSalary, timeAgo } from "@/lib/format";
import { SOURCE_META, sourceLabel } from "@/lib/jobs/labels";
import type { Application, Job, Profile } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/jobs/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("jobs").select("title, company").eq("id", id).maybeSingle();
  return { title: data ? `${data.title} at ${data.company}` : "Job" };
}

export default async function JobPage(props: PageProps<"/jobs/[id]">) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();

  const [{ data: job }, { data: app }, { data: profile }, aiReady] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
    supabase.from("applications").select("*").eq("job_id", id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    hasAIConfig(user.id),
  ]);
  if (!job) notFound();

  const j = job as Job;
  const salary = formatSalary(j);
  const estimate = profile ? keywordMatch(profile as unknown as Profile, j) : null;
  const sourceHome = SOURCE_META[j.source]?.homepage;

  return (
    <>
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft size={14} /> Back to search
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <section className="bento pastel-lavender relative overflow-hidden p-6 md:p-7">
            <div className="grid-dots pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative flex items-start gap-4">
              <CompanyLogo src={j.company_logo} company={j.company} size={56} />
              <div className="min-w-0">
                <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] md:text-[30px]">{j.title}</h1>
                <p className="mt-1 font-medium text-fg/70">{j.company}</p>
              </div>
            </div>
            <div className="relative">
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {j.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {j.location}
                </span>
              )}
              {j.remote && <Badge tone="info">Remote</Badge>}
              {j.employment_type && <Badge>{j.employment_type}</Badge>}
              {salary && (
                <span className="inline-flex items-center gap-1">
                  <Wallet size={14} /> {salary}
                </span>
              )}
              {j.posted_at && <span>Posted {timeAgo(j.posted_at)}</span>}
            </div>
            {j.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {j.tags.slice(0, 12).map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={j.apply_url || j.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-ink-fg shadow-[0_6px_16px_rgba(21,32,26,0.16)] hover:opacity-95"
              >
                Open application page <ExternalLink size={14} />
              </a>
              <a
                href={j.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm hover:bg-surface-2"
              >
                View on {sourceLabel(j.source)} <ExternalLink size={14} />
              </a>
            </div>
            </div>
          </section>

          <Card className="mt-4 p-6">
            <h2 className="mb-3 font-medium">Job description</h2>
            <div className="prose-job text-sm">{j.description || "No description provided — open the original posting."}</div>
            <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
              Listing provided by{" "}
              {sourceHome ? (
                <a href={sourceHome} className="underline" target="_blank" rel="noopener">
                  {sourceLabel(j.source)}
                </a>
              ) : (
                sourceLabel(j.source)
              )}
              . Always apply through the original posting.
            </p>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <JobAIPanel
            jobId={j.id}
            application={(app as Application | null) ?? null}
            aiReady={aiReady}
            hasResume={!!profile?.resume_text || !!profile?.skills?.length}
            estimate={estimate}
          />
        </div>
      </div>
    </>
  );
}
