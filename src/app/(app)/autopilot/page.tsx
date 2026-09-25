import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Bot, CheckCircle2, Clock3, FileText, Hand, Loader, Search, Target } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { closeInterruptedRuns } from "@/lib/autopilot";
import { enabledSources } from "@/lib/jobs/sources";
import { getUserSourceKeyInfo } from "@/lib/source-keys";
import { Card, IconTile, Notice, PageHeader, SectionTitle, type Tone } from "@/components/ui";
import { AutopilotManager } from "@/components/autopilot-manager";
import { timeAgo } from "@/lib/format";
import type { AutopilotRule } from "@/lib/types";

export const metadata: Metadata = { title: "Autopilot" };

const HOW: { icon: React.ReactNode; tone: Tone; title: string; body: string }[] = [
  { icon: <Search size={18} />, tone: "primary", title: "Searches every day", body: "Checks all your job sources for new postings." },
  { icon: <Target size={18} />, tone: "primary", title: "Scores each match", body: "The AI compares every new job with your profile." },
  { icon: <FileText size={18} />, tone: "primary", title: "Writes applications", body: "The best matches get a tailored cover letter and answers." },
  { icon: <Hand size={18} />, tone: "success", title: "You review and send", body: "About a minute each. You always press submit." },
];

export default async function AutopilotPage() {
  const { supabase, user } = await requireUser();
  await closeInterruptedRuns({ userId: user.id });
  const hasOwnJSearch = !!(await getUserSourceKeyInfo(user.id, "jsearch"));
  const [{ data: rules }, { data: runs }, aiReady, { data: profile }] = await Promise.all([
    supabase.from("autopilot_rules").select("*").order("created_at"),
    supabase.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(15),
    hasAIConfig(user.id),
    supabase.from("profiles").select("desired_titles, desired_locations, remote_preference, resume_text").eq("id", user.id).single(),
  ]);

  return (
    <>
      <PageHeader
        icon={<Bot size={22} />}
        tone="primary"
        eyebrow={
          <>
            <Clock3 size={14} aria-hidden="true" /> Runs every day
          </>
        }
        title="Autopilot"
        description="Saved searches that run every day. New matches above your score threshold get a full application written, ready for you in “Ready to apply”."
      />

      {(!aiReady || !profile?.resume_text) && (
        <div className="mb-6 grid gap-3">
          {!aiReady && (
            <Notice tone="warn">
              Autopilot needs AI to score and write. <Link href="/settings">Turn on AI for free</Link> to start it.
            </Notice>
          )}
          {!profile?.resume_text && (
            <Notice tone="warn">
              <Link href="/profile">Upload your resume</Link> so autopilot knows what to look for.
            </Notice>
          )}
        </div>
      )}

      <section aria-labelledby="how-autopilot" className="mb-8">
        <h2 id="how-autopilot" className="sr-only">
          How autopilot works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((h, i) => (
            <li key={h.title} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
              <IconTile tone={h.tone}>{h.icon}</IconTile>
              <div className="min-w-0">
                <p className="text-sm font-bold text-fg">
                  <span className="text-subtle">{i + 1}.</span> {h.title}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{h.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Autopilot never submits applications on its own. Job sites prohibit bots, and most forms need a human check. It does
          everything up to the submit button.
        </p>
      </section>

      <AutopilotManager
        rules={(rules ?? []) as AutopilotRule[]}
        sources={enabledSources({ jsearchUserKey: hasOwnJSearch ? { key: "", monthlyLimit: 0 } : null }).map((s) => ({ id: s.id, label: s.label }))}
        defaults={{
          keywords: profile?.desired_titles?.[0] ?? "",
          location: profile?.desired_locations?.[0] ?? "",
          remoteOnly: profile?.remote_preference === "remote",
        }}
        aiReady={aiReady}
        activeRuns={Object.fromEntries(
          (runs ?? []).filter((r) => !r.finished_at && r.rule_id).map((r) => [r.rule_id as string, r.id]),
        )}
      />

      <Card className="mt-8 p-5 sm:p-6">
        <SectionTitle icon={<Clock3 size={18} />} tone="neutral" title="Recent runs" hint="The last 15 times autopilot went looking." />
        {(runs ?? []).length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">No runs yet. Runs happen once a day, or click “Run now”.</p>
        ) : (
          <ul className="divide-y divide-border">
            {runs!.map((r) => {
              const name = (rules ?? []).find((x) => x.id === r.rule_id)?.name ?? "Deleted search";
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <span className="shrink-0" role="img" aria-label={r.error ? "Failed" : !r.finished_at ? "Running" : "Finished"}>
                    {r.error ? (
                      <AlertCircle size={20} className="text-danger" aria-hidden="true" />
                    ) : !r.finished_at ? (
                      <Loader size={20} className="animate-spin text-primary-text" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 size={20} className="text-success" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{name}</p>
                    <p className={r.error ? "text-[13px] text-danger" : "text-[13px] text-muted"}>
                      {r.error ?? (!r.finished_at ? "Running now…" : timeAgo(r.started_at))}
                      {r.error || !r.finished_at ? ` · ${timeAgo(r.started_at)}` : ""}
                    </p>
                  </div>
                  <dl className="flex gap-4 text-right text-[13px]">
                    {[
                      ["New jobs", r.jobs_found],
                      ["Scored", r.jobs_scored],
                      ["Written", r.drafts_created],
                    ].map(([label, n]) => (
                      <div key={label as string}>
                        <dt className="text-muted">{label}</dt>
                        <dd className="font-bold tabular-nums text-fg">{n}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
