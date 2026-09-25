import type { Job } from "@/lib/types";

// Which employer application forms can be shown inside OpenApply.
// Greenhouse publishes an official embeddable form; Lever's apply page
// allows framing. Ashby and most boards forbid it (X-Frame-Options: DENY).

export function embeddableApplyUrl(job: Pick<Job, "source" | "external_id" | "url" | "apply_url">): string | null {
  if (job.source === "greenhouse") {
    const [board, id] = job.external_id.split(":");
    if (board && id) return `https://job-boards.greenhouse.io/embed/job_app?for=${encodeURIComponent(board)}&token=${encodeURIComponent(id)}`;
  }
  if (job.source === "lever") {
    const base = job.apply_url || job.url;
    if (base?.startsWith("https://jobs.lever.co/")) return base.endsWith("/apply") ? base : `${base.replace(/\/$/, "")}/apply`;
  }
  return null;
}
