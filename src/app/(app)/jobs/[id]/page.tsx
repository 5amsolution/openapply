import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, MapPin, Wallet } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { keywordMatch } from "@/lib/matching";
import { Badge, Card, buttonClass } from "@/components/ui";
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
      <Link href="/jobs" className="mb-5 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm font-semibold text-muted transition-colors hover:text-fg">
        <ArrowLeft size={16} aria-hidden="true" /> Back to search
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="grid min-w-0 content-start gap-5">
          <Card className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <CompanyLogo src={j.company_logo} company={j.company} size={60} />
              <div className="min-w-0">
                <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.025em] text-fg md:text-[30px]">{j.title}</h1>
                <p className="mt-1 text-base font-semibold text-muted">{j.company}</p>
              </div>
            </div>

            <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-muted">
              {j.location && (
                <div className="inline-flex items-center gap-1.5">
                  <dt className="sr-only">Location</dt>
                  <MapPin size={16} aria-hidden="true" />
                  <dd>{j.location}</dd>
                </div>
              )}
              {salary && (
                <div className="inline-flex items-center gap-1.5">
                  <dt className="sr-only">Salary</dt>
                  <Wallet size={16} aria-hidden="true" />
                  <dd className="font-semibold text-fg">{salary}</dd>
                </div>
              )}
              {j.posted_at && (
                <div className="inline-flex items-center gap-1.5">
                  <dt className="sr-only">Posted</dt>
                  <Clock size={16} aria-hidden="true" />
                  <dd>Posted {timeAgo(j.posted_at)}</dd>
                </div>
              )}
              {(j.remote || j.employment_type) && (
                <div className="inline-flex items-center gap-1.5">
                  <dt className="sr-only">Type</dt>
                  <dd className="flex gap-1.5">
                    {j.remote && <Badge tone="info">Remote</Badge>}
                    {j.employment_type && <Badge>{j.employment_type}</Badge>}
                  </dd>
                </div>
              )}
            </dl>

            {j.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
                {j.tags.slice(0, 12).map((t) => (
                  <li key={t}>
                    <Badge>{t}</Badge>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
              <a href={j.apply_url || j.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
                Open application page <ExternalLink size={15} aria-hidden="true" />
              </a>
              <a href={j.url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
                View on {sourceLabel(j.source)} <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          </Card>

          <Card className="p-5 sm:p-7">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-fg">About this job</h2>
            <div className="prose-job text-fg">{j.description || "No description provided — open the original posting."}</div>
            <p className="mt-8 border-t border-border pt-4 text-[13px] text-muted">
              Listing provided by{" "}
              {sourceHome ? (
                <a href={sourceHome} className="font-semibold text-primary-text underline underline-offset-2" target="_blank" rel="noopener">
                  {sourceLabel(j.source)}
                </a>
              ) : (
                sourceLabel(j.source)
              )}
              . Always apply through the original posting.
            </p>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
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
