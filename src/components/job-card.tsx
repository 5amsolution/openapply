import Link from "next/link";
import { MapPin, Wallet } from "lucide-react";
import { Badge, Card, ScoreBadge } from "@/components/ui";
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
  return (
    <Card interactive className="group relative flex gap-4 p-4">
      <CompanyLogo src={job.company_logo} company={job.company} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/jobs/${job.id}`} className="font-semibold leading-snug after:absolute after:inset-0 after:content-[''] group-hover:text-accent">
              {job.title}
            </Link>
            <p className="truncate text-sm text-muted">{job.company}</p>
          </div>
          <div className="relative z-10 flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <ScoreBadge score={score} />
            {status ? (
              <Link href={`/applications/${applicationId}`}>
                <Badge tone="accent">{STATUS_LABELS[status]}</Badge>
              </Link>
            ) : (
              <SaveJobButton jobId={job.id} />
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted sm:text-sm">
          {job.location && (
            <span className="inline-flex max-w-full items-center gap-1 truncate">
              <MapPin size={13} /> {job.location.length > 48 ? job.location.slice(0, 48) + "…" : job.location}
            </span>
          )}
          {job.remote && <Badge tone="info">Remote</Badge>}
          {salary && (
            <span className="inline-flex items-center gap-1 font-medium text-fg">
              <Wallet size={13} /> {salary}
            </span>
          )}
          <span>
            {via ? via.replace("via ", "") : sourceLabel(job.source)}
            {job.posted_at ? ` · ${timeAgo(job.posted_at)}` : ""}
          </span>
        </div>
      </div>
    </Card>
  );
}
