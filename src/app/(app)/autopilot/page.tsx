import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { closeInterruptedRuns } from "@/lib/autopilot";
import { enabledSources } from "@/lib/jobs/sources";
import { getUserSourceKeyInfo } from "@/lib/source-keys";
import { Card, Notice, PageHeader } from "@/components/ui";
import { AutopilotManager } from "@/components/autopilot-manager";
import { timeAgo } from "@/lib/format";
import type { AutopilotRule } from "@/lib/types";

export const metadata: Metadata = { title: "Autopilot" };

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
        title="Autopilot"
        description="Saved searches that run every day. New matches above your score threshold get a full application written and land in “Ready to apply”."
      />

      <div className="mb-6 grid gap-3">
        {!aiReady && (
          <Notice tone="warn">
            Autopilot needs AI to score and write. <Link href="/settings" className="underline">Turn on AI for free</Link> to start it.
          </Notice>
        )}
        {!profile?.resume_text && (
          <Notice tone="warn">
            <Link href="/profile" className="underline">Upload your resume</Link> so autopilot knows what to look for.
          </Notice>
        )}
        <Notice>
          Autopilot never submits applications on its own — job sites prohibit bots and most forms need a human check. It does
          everything up to the submit button so applying takes about a minute per job.
        </Notice>
      </div>

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

      <Card className="mt-8 p-5">
        <h2 className="mb-3 font-medium">Recent runs</h2>
        {(runs ?? []).length === 0 ? (
          <p className="text-sm text-muted">No runs yet. Runs happen once a day, or click “Run now”.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-2 font-normal">When</th>
                <th className="pb-2 font-normal">Search</th>
                <th className="pb-2 text-right font-normal">New jobs</th>
                <th className="pb-2 text-right font-normal">Scored</th>
                <th className="pb-2 text-right font-normal">Drafted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs!.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 text-muted">{timeAgo(r.started_at)}</td>
                  <td className="py-2">
                    {(rules ?? []).find((x) => x.id === r.rule_id)?.name ?? "—"}
                    {r.error && <p className="text-xs text-danger">{r.error}</p>}
                    {!r.finished_at && <p className="text-xs text-muted">Running…</p>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.jobs_found}</td>
                  <td className="py-2 text-right tabular-nums">{r.jobs_scored}</td>
                  <td className="py-2 text-right tabular-nums">{r.drafts_created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
