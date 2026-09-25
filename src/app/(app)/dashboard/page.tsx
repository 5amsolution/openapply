import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, ButtonLink, Card, PageHeader, ScoreBadge } from "@/components/ui";
import { STATUS_LABELS, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const STAT_PASTEL: Record<string, string> = {
  saved: "pastel-cool",
  ready: "pastel-lime",
  applied: "pastel-lavender",
  interviewing: "pastel-peach",
  offer: "pastel-pink",
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: apps }, { data: runs }, { count: ruleCount }, aiReady, { count: tokenCount }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, resume_path, skills").eq("id", user.id).single(),
      supabase
        .from("applications")
        .select("id, status, match_score, updated_at, origin, job:jobs(title, company)")
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(5),
      supabase.from("autopilot_rules").select("id", { count: "exact", head: true }).eq("active", true),
      hasAIConfig(user.id),
      createAdminClient().from("extension_tokens").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

  const counts = new Map<string, number>();
  for (const a of apps ?? []) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  const ready = (apps ?? []).filter((a) => a.status === "ready").slice(0, 6);

  const steps = [
    { done: !!profile?.resume_path, label: "Upload your resume", href: "/profile" },
    { done: aiReady, label: "Turn on AI (free)", href: "/settings" },
    { done: (counts.size ?? 0) > 0, label: "Search and save a job", href: "/jobs" },
    { done: (ruleCount ?? 0) > 0, label: "Turn on autopilot", href: "/autopilot" },
    { done: (tokenCount ?? 0) > 0, label: "Connect the autofill extension", href: "/settings#extension" },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <>
      <PageHeader
        title={profile?.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Welcome"}
        description="Here's where your job search stands."
        actions={<ButtonLink href="/jobs">Find jobs</ButtonLink>}
      />

      {remaining > 0 && (
        <Card className="mb-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Get set up</h2>
            <span className="text-sm text-muted">
              {steps.length - remaining} of {steps.length} done
            </span>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                  {s.done ? <CheckCircle2 size={16} className="text-accent" /> : <Circle size={16} className="text-muted" />}
                  <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["saved", "ready", "applied", "interviewing", "offer"] as const).map((s) => (
          <Link key={s} href={`/applications?status=${s}`}>
            <Card className={`${STAT_PASTEL[s]} border-white/70 p-5 transition hover:-translate-y-0.5`}>
              <p className="text-[32px] font-extrabold leading-none tracking-[-0.035em] tabular-nums">{counts.get(s) ?? 0}</p>
              <p className="mt-2 text-sm font-medium text-fg/70">{STATUS_LABELS[s]}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Ready to apply</h2>
            <Link href="/applications?status=ready" className="text-sm text-muted hover:text-fg">
              View all
            </Link>
          </div>
          {ready.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nothing waiting. Open a job and click <b>Write application</b>, or let autopilot find some.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {ready.map((a) => {
                const job = a.job as unknown as { title: string; company: string } | null;
                return (
                  <li key={a.id}>
                    <Link href={`/applications/${a.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{job?.title}</p>
                        <p className="truncate text-sm text-muted">{job?.company}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {a.origin === "autopilot" && <Badge tone="info">Autopilot</Badge>}
                        <ScoreBadge score={a.match_score} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Autopilot activity</h2>
            <Link href="/autopilot" className="text-sm text-muted hover:text-fg">
              Manage
            </Link>
          </div>
          {(runs ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No runs yet.</p>
          ) : (
            <ul className="grid gap-3 text-sm">
              {runs!.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-2">
                  <div>
                    <p>
                      {r.error ? (
                        <span className="text-danger">{r.error}</span>
                      ) : (
                        <>
                          {r.drafts_created} drafted · {r.jobs_scored} scored
                        </>
                      )}
                    </p>
                    <p className="text-muted">{r.jobs_found} new jobs found</p>
                  </div>
                  <span className="shrink-0 text-muted">{timeAgo(r.started_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
