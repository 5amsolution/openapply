import Link from "next/link";
import { Building2, MapPin, Wallet } from "lucide-react";
import { Badge, Card, ScoreBadge } from "@/components/ui";
import { SaveJobButton } from "@/components/save-job-button";
import { formatSalary, STATUS_LABELS, timeAgo } from "@/lib/format";
import { sourceLabel } from "@/lib/jobs/labels";
import type { Job } from "@/lib/types";

export function JobCard({
  job,
  score,
  applicationId,
  status,
}: {
  job: Job;
  score: number | null | undefined;
  applicationId?: string;
  status?: string;
}) {
  const salary = formatSalary(job);
  return (
    <Card className="flex gap-4 p-4 transition hover:border-accent/40">
      <div className="hidden h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 sm:flex">
        {job.company_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.company_logo} alt="" className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <Building2 size={18} className="text-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/jobs/${job.id}`} className="font-medium hover:text-accent">
              {job.title}
            </Link>
            <p className="text-sm text-muted">{job.company}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {job.location.length > 60 ? job.location.slice(0, 60) + "…" : job.location}
            </span>
          )}
          {job.remote && <Badge tone="info">Remote</Badge>}
          {salary && (
            <span className="inline-flex items-center gap-1">
              <Wallet size={14} /> {salary}
            </span>
          )}
          <span>
            {sourceLabel(job.source)}
            {job.posted_at ? ` · ${timeAgo(job.posted_at)}` : ""}
          </span>
        </div>
      </div>
    </Card>
  );
}
