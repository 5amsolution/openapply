import type { Job } from "@/lib/types";

export function formatSalary(job: Pick<Job, "salary_min" | "salary_max" | "salary_currency" | "salary_period">): string | null {
  const { salary_min: min, salary_max: max } = job;
  if (!min && !max) return null;
  const cur = job.salary_currency || "";
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
  const range = min && max && min !== max ? `${fmt(min)}–${fmt(max)}` : fmt((min || max)!);
  const period = job.salary_period ? ` / ${job.salary_period.replace(/ly$/, "").replace("annual", "yr")}` : "";
  return `${cur === "USD" ? "$" : cur ? cur + " " : ""}${range}${period}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86_400 * 30) return `${Math.round(s / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  ready: "Ready to apply",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Archived",
};
