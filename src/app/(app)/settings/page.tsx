import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAISettingsPublic } from "@/lib/ai/settings";
import { PROVIDERS, providerInfo } from "@/lib/ai/providers";
import { OpenRouterConnect } from "@/components/openrouter-connect";
import { Card, PageHeader } from "@/components/ui";
import { AISettingsForm } from "@/components/ai-settings-form";
import { ExtensionTokens } from "@/components/extension-tokens";
import { DangerZone } from "@/components/danger-zone";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage(props: PageProps<"/settings">) {
  const sp = await props.searchParams;
  const { supabase, user } = await requireUser();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [ai, { data: usage }, { data: tokens }] = await Promise.all([
    getAISettingsPublic(user.id),
    supabase.from("ai_usage").select("feature, input_tokens, output_tokens").gte("created_at", monthStart.toISOString()),
    createAdminClient()
      .from("extension_tokens")
      .select("id, label, created_at, last_used_at")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const byFeature = new Map<string, { calls: number; tokens: number }>();
  for (const u of usage ?? []) {
    const cur = byFeature.get(u.feature) ?? { calls: 0, tokens: 0 };
    byFeature.set(u.feature, { calls: cur.calls + 1, tokens: cur.tokens + u.input_tokens + u.output_tokens });
  }
  const total = [...byFeature.values()].reduce((s, v) => s + v.tokens, 0);
  const FEATURE_LABELS: Record<string, string> = {
    match: "Fit scoring",
    draft: "Application writing",
    answers: "Extra answers",
    resume: "Resume reading",
    test: "Connection tests",
  };

  return (
    <>
      <PageHeader title="Settings" />

      <div className="grid gap-6">
        <OpenRouterConnect
          connected={ai?.connected_via === "oauth" && ai.provider === "openrouter"}
          model={ai?.provider === "openrouter" ? ai.model : null}
          models={providerInfo("openrouter")?.models ?? []}
          status={typeof sp.openrouter === "string" ? sp.openrouter : undefined}
          statusMessage={typeof sp.message === "string" ? sp.message : undefined}
        />

        <details className="group rounded-xl border border-border bg-surface" open={!!ai && ai.connected_via !== "oauth"}>
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium">
            Advanced: use your own API key instead
            <span className="ml-2 font-normal text-muted">Anthropic, OpenAI, Gemini, Groq, or a custom server</span>
          </summary>
          <div className="border-t border-border">
            <AISettingsForm
              providers={PROVIDERS.map((p) => ({ id: p.id, label: p.label, keyUrl: p.keyUrl, baseUrl: p.baseUrl ?? "", models: p.models }))}
              current={ai?.connected_via === "oauth" ? null : ai}
            />
          </div>
        </details>

        <Card className="p-5">
          <h2 className="font-medium">AI usage this month</h2>
          <p className="mb-4 text-sm text-muted">
            Billed by your provider, not by us. {ai?.monthly_token_limit ? `Your cap: ${ai.monthly_token_limit.toLocaleString()} tokens.` : ""}
          </p>
          {total === 0 ? (
            <p className="text-sm text-muted">No AI calls yet this month.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-border">
                {[...byFeature.entries()].map(([f, v]) => (
                  <tr key={f}>
                    <td className="py-2">{FEATURE_LABELS[f] ?? f}</td>
                    <td className="py-2 text-right tabular-nums text-muted">{v.calls} calls</td>
                    <td className="py-2 text-right tabular-nums">{v.tokens.toLocaleString()} tokens</td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2">Total</td>
                  <td />
                  <td className="py-2 text-right tabular-nums">{total.toLocaleString()} tokens</td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>

        <ExtensionTokens tokens={tokens ?? []} siteUrl={process.env.NEXT_PUBLIC_SITE_URL || ""} />

        <DangerZone email={user.email ?? ""} />
      </div>
    </>
  );
}
