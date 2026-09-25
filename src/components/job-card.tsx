import Link from "next/link";
import { Clock, MapPin, Wallet } from "lucide-react";
import { Badge, Card, STATUS_TONE, ScoreBadge } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import { SaveJobButton } from "@/components/save-job-button";
import { formatSalary, STATUS_LABELS, timeAgo } from "@/lib/format";
import { sourceLabel } from "@/lib/jobs/labels";
import type { Job } from "@/lib/types";

/** What a result card needs — no description, so result lists stay light. */
export type JobSummary = Pick<
  Job,
  "id" | "title" | "company" | "company_logo" | "location" | "remote" | "salary_min" | "salary_max" | "salary_currency" | "salary_period" | "source" | "posted_at" | "tags"
>;

export function JobCard({
  job,
  score,
  applicationId,
  status,
}: {
  job: JobSummary;
  score: number | null | undefined;
  applicationId?: string;
  status?: string;
}) {
  const salary = formatSalary(job);
  const via = job.tags.find((t) => t.startsWith("via "));
  const location = job.location && job.location.length > 48 ? job.location.slice(0, 48) + "…" : job.location;

  return (
    <Card interactive className="group relative p-4 sm:p-5">
      <div className="flex gap-4">
        <CompanyLogo src={job.company_logo} company={job.company} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                href={`/jobs/${job.id}`}
                className="text-base font-bold leading-snug tracking-[-0.01em] text-fg transition-colors after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:text-primary-text"
              >
                {job.title}
              </Link>
              <p className="mt-0.5 truncate text-sm font-medium text-muted">{job.company}</p>
            </div>
            <div className="relative z-10 flex shrink-0 items-center gap-2">
              <ScoreBadge score={score} />
              {status ? (
                <Link href={`/applications/${applicationId}`} className="rounded-full">
                  <Badge tone={STATUS_TONE[status] ?? "primary"}>{STATUS_LABELS[status]}</Badge>
                </Link>
              ) : (
                <SaveJobButton jobId={job.id} />
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
            {location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" className="shrink-0" /> {location}
              </span>
            )}
            {job.remote && <Badge tone="info">Remote</Badge>}
            {salary && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                <Wallet size={14} aria-hidden="true" className="text-muted" /> {salary}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} aria-hidden="true" className="shrink-0" />
              {via ? via.replace("via ", "") : sourceLabel(job.source)}
              {job.posted_at ? ` · ${timeAgo(job.posted_at)}` : ""}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
