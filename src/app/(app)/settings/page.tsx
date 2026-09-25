import type { Metadata } from "next";
import { BarChart3, ChevronDown, KeyRound, Palette, Settings } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAISettingsPublic } from "@/lib/ai/settings";
import { PROVIDERS, providerInfo } from "@/lib/ai/providers";
import { OpenRouterConnect } from "@/components/openrouter-connect";
import { Card, IconTile, PageHeader, SectionTitle } from "@/components/ui";
import { AISettingsForm } from "@/components/ai-settings-form";
import { ExtensionTokens } from "@/components/extension-tokens";
import { DangerZone } from "@/components/danger-zone";
import { JSearchKeyCard } from "@/components/jsearch-key-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { getUserSourceKeyInfo } from "@/lib/source-keys";
import { serverEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  ["ai", "AI"],
  ["job-sources", "Job sources"],
  ["extension", "Extension"],
  ["appearance", "Appearance"],
  ["account", "Account"],
] as const;

const FEATURE_LABELS: Record<string, string> = {
  match: "Fit scoring",
  draft: "Application writing",
  answers: "Extra answers",
  resume: "Resume reading",
  test: "Connection tests",
};

export default async function SettingsPage(props: PageProps<"/settings">) {
  const sp = await props.searchParams;
  const { supabase, user } = await requireUser();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [ai, { data: usage }, { data: tokens }, jsearchInfo] = await Promise.all([
    getAISettingsPublic(user.id),
    supabase.from("ai_usage").select("feature, input_tokens, output_tokens").gte("created_at", monthStart.toISOString()),
    createAdminClient()
      .from("extension_tokens")
      .select("id, label, created_at, last_used_at")
      .eq("user_id", user.id)
      .order("created_at"),
    getUserSourceKeyInfo(user.id, "jsearch"),
  ]);

  const byFeature = new Map<string, { calls: number; tokens: number }>();
  for (const u of usage ?? []) {
    const cur = byFeature.get(u.feature) ?? { calls: 0, tokens: 0 };
    byFeature.set(u.feature, { calls: cur.calls + 1, tokens: cur.tokens + u.input_tokens + u.output_tokens });
  }
  const total = [...byFeature.values()].reduce((s, v) => s + v.tokens, 0);
  const max = Math.max(1, ...[...byFeature.values()].map((v) => v.tokens));

  return (
    <>
      <PageHeader
        icon={<Settings size={22} />}
        tone="neutral"
        title="Settings"
        description="Your AI connection, job sources, autofill extension, appearance and account."
      />

      <nav aria-label="Settings sections" className="no-scrollbar -mx-4 mb-8 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-border-strong bg-surface px-3.5 text-[13px] font-semibold text-muted transition-colors hover:border-primary hover:text-primary-text"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-12">
        <SettingsSection id="ai" title="AI" description="Scores your fit and writes your applications. Free with an OpenRouter account.">
          <OpenRouterConnect
            connected={ai?.connected_via === "oauth" && ai.provider === "openrouter"}
            model={ai?.provider === "openrouter" ? ai.model : null}
            models={providerInfo("openrouter")?.models ?? []}
            status={typeof sp.openrouter === "string" ? sp.openrouter : undefined}
            statusMessage={typeof sp.message === "string" ? sp.message : undefined}
          />

          <details className="group rounded-2xl border border-border bg-surface shadow-xs" open={!!ai && ai.connected_via !== "oauth"}>
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-5 py-4">
              <IconTile tone="neutral" size="sm">
                <KeyRound size={16} />
              </IconTile>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-fg">Advanced: use your own API key instead</span>
                <span className="block text-[13px] text-muted">Anthropic, OpenAI, Gemini, Groq, or a custom server</span>
              </span>
              <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border">
              <AISettingsForm
                providers={PROVIDERS.map((p) => ({ id: p.id, label: p.label, keyUrl: p.keyUrl, baseUrl: p.baseUrl ?? "", models: p.models }))}
                current={ai?.connected_via === "oauth" ? null : ai}
              />
            </div>
          </details>

          <Card className="p-5 sm:p-6">
            <SectionTitle
              level={3}
              icon={<BarChart3 size={18} />}
              tone="primary"
              title="AI usage this month"
              hint={`Billed by your provider, not by us.${ai?.monthly_token_limit ? ` Your cap: ${ai.monthly_token_limit.toLocaleString()} tokens.` : ""}`}
            />
            {total === 0 ? (
              <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">No AI calls yet this month.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <caption className="sr-only">AI usage by feature this month</caption>
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-muted">
                    <th scope="col" className="pb-2 font-semibold">
                      Feature
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold">
                      Calls
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold">
                      Tokens
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...byFeature.entries()].map(([f, v]) => (
                    <tr key={f}>
                      <td className="py-2.5">
                        <span className="font-medium text-fg">{FEATURE_LABELS[f] ?? f}</span>
                        <span className="mt-1.5 block h-1.5 max-w-56 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (v.tokens / max) * 100)}%` }} />
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted">{v.calls}</td>
                      <td className="py-2.5 text-right tabular-nums text-fg">{v.tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-bold text-fg">
                    <td className="pt-3">Total</td>
                    <td />
                    <td className="pt-3 text-right tabular-nums">{total.toLocaleString()} tokens</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Card>
        </SettingsSection>

        <SettingsSection id="job-sources" title="Job sources" description="Add LinkedIn, Indeed and Glassdoor listings to every search.">
          <JSearchKeyCard info={jsearchInfo} siteKeyAvailable={!!serverEnv.jsearchKey()} />
        </SettingsSection>

        <SettingsSection id="extension" title="Autofill extension" description="Fill application forms on any site in one click.">
          <ExtensionTokens tokens={tokens ?? []} siteUrl={process.env.NEXT_PUBLIC_SITE_URL || ""} />
        </SettingsSection>

        <SettingsSection id="appearance" title="Appearance" description="Choose how 5AM Apply looks on this device.">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <IconTile tone="primary">
                <Palette size={18} />
              </IconTile>
              <div>
                <p className="text-base font-bold text-fg">Theme</p>
                <p className="text-sm text-muted">“System” follows your device&apos;s light or dark setting.</p>
              </div>
            </div>
            <ThemeToggle labels className="w-full sm:w-auto" />
          </Card>
        </SettingsSection>

        <SettingsSection id="account" title="Account" description="Sign out or delete your data.">
          <DangerZone email={user.email ?? ""} />
        </SettingsSection>
      </div>
    </>
  );
}

function SettingsSection({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid min-w-0 scroll-mt-24 grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h2 id={`${id}-title`} className="text-lg font-bold tracking-tight text-fg">
          {title}
        </h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
