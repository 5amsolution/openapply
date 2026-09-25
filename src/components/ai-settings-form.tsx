"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { removeAIKeyAction, saveAISettingsAction, testAIKeyAction } from "@/app/(app)/actions";
import { Button, Input, Label, Notice, Select } from "@/components/ui";
import { ProgressSteps, STEPS, friendlyError } from "@/components/progress";
import type { ProviderId } from "@/lib/ai/providers";

type ProviderOption = { id: ProviderId; label: string; keyUrl: string; baseUrl: string; models: { id: string; label: string }[] };

export function AISettingsForm({
  providers,
  current,
}: {
  providers: ProviderOption[];
  current: { provider: string; model: string; base_url: string | null; api_key_hint: string | null; monthly_token_limit: number | null } | null;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderId>((current?.provider as ProviderId) ?? "anthropic");
  const info = providers.find((p) => p.id === provider)!;
  const [model, setModel] = useState(current?.model ?? info.models[0]?.id ?? "");
  const [baseUrl, setBaseUrl] = useState(current?.base_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [limit, setLimit] = useState(current?.monthly_token_limit ? String(current.monthly_token_limit) : "");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  // Run async work outside a transition so "busy" state renders immediately
  // (state set inside startTransition only shows once the whole action finishes).
  const start = (fn: () => Promise<void>) => void fn();

  const sameProvider = current?.provider === provider;

  const act = (key: string, fn: () => Promise<string>) =>
    start(async () => {
      setBusy(key);
      setMessage(null);
      try {
        setMessage({ tone: "success", text: await fn() });
        router.refresh();
      } catch (e) {
        setMessage({ tone: "danger", text: friendlyError(e) });
      } finally {
        setBusy("");
      }
    });

  const save = () =>
    act("save", async () => {
      const res = await saveAISettingsAction({
        provider,
        model,
        baseUrl: baseUrl || undefined,
        apiKey: apiKey || undefined,
        monthlyTokenLimit: limit ? Number(limit) : null,
      });
      if (!res.ok) throw new Error(res.error);
      setApiKey("");
      const test = await testAIKeyAction();
      if (!test.ok) throw new Error(`Saved, but the test call failed: ${test.error}`);
      return `Saved. ${test.data}.`;
    });

  return (
    <div className="p-5 sm:p-6">
      <p className="mb-5 flex gap-2.5 rounded-xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-muted">
        <ShieldCheck size={18} aria-hidden="true" className="mt-px shrink-0 text-success" />
        AI calls go to your own account with your provider. Your key is encrypted (AES-256-GCM) and only used on our server for
        your own requests.
      </p>

      <form
        className="grid gap-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <Label htmlFor="ai-provider">Provider</Label>
          <Select
            id="ai-provider"
            value={provider}
            onChange={(e) => {
              const p = e.target.value as ProviderId;
              setProvider(p);
              const next = providers.find((x) => x.id === p)!;
              setModel(p === current?.provider ? current.model : next.models[0]?.id ?? "");
              setBaseUrl(p === current?.provider ? current.base_url ?? "" : "");
            }}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ai-model" hint="pick or type any model id">
            Model
          </Label>
          <Input id="ai-model" list="ai-models" value={model} onChange={(e) => setModel(e.target.value)} required />
          <datalist id="ai-models">
            {info.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </datalist>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="ai-key" hint={sameProvider && current?.api_key_hint ? `saved: ${current.api_key_hint} — leave blank to keep` : undefined}>
            API key
          </Label>
          <Input
            id="ai-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === "custom" ? "Optional for local servers" : "Paste your key"}
          />
          {info.keyUrl && (
            <a href={info.keyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary-text hover:underline">
              Get a {info.label} key <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </div>
        {(provider === "custom" || baseUrl) && (
          <div>
            <Label htmlFor="ai-base" hint="OpenAI-compatible, ending in /v1">
              Base URL
            </Label>
            <Input id="ai-base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={info.baseUrl || "https://my-server.example.com/v1"} required={provider === "custom"} />
          </div>
        )}
        <div>
          <Label htmlFor="ai-limit" hint="optional safety cap">
            Monthly token limit
          </Label>
          <Input id="ai-limit" type="number" min={0} step={10000} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="e.g. 2000000" />
        </div>
        <ProgressSteps className="md:col-span-2" active={busy === "save" || busy === "test"} steps={STEPS.test} />
        {message && !busy && (
          <div className="md:col-span-2">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit" disabled={!!busy} loading={busy === "save"}>
            {busy === "save" ? "Saving & testing…" : "Save and test"}
          </Button>
          {current && (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={!!busy}
                loading={busy === "test"}
                onClick={() =>
                  act("test", async () => {
                    const r = await testAIKeyAction();
                    if (!r.ok) throw new Error(r.error);
                    return r.data;
                  })
                }
              >
                {busy === "test" ? "Testing…" : "Test connection"}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={!!busy}
                onClick={() =>
                  act("remove", async () => {
                    const r = await removeAIKeyAction();
                    if (!r.ok) throw new Error(r.error);
                    return "Key removed.";
                  })
                }
              >
                Remove key
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
