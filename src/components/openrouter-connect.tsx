"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { removeAIKeyAction, setAIModelAction, testAIKeyAction } from "@/app/(app)/actions";
import { Badge, Button, Card, Input, Label, Notice } from "@/components/ui";
import { ProgressSteps, STEPS, friendlyError } from "@/components/progress";

type Model = { id: string; label: string };

export function OpenRouterConnect({
  connected,
  model,
  models,
  status,
  statusMessage,
}: {
  connected: boolean;
  model: string | null;
  models: Model[];
  status?: string;
  statusMessage?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(model ?? models[0]?.id ?? "");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ tone: "accent" | "danger"; text: string } | null>(
    status === "connected"
      ? { tone: "accent", text: "Connected! You're using a free model — no card needed." }
      : status === "error"
        ? { tone: "danger", text: statusMessage || "Couldn't connect to OpenRouter." }
        : null,
  );
  // Run async work outside a transition so "busy" state renders immediately
  // (state set inside startTransition only shows once the whole action finishes).
  const start = (fn: () => Promise<void>) => void fn();
  const isFree = value === "openrouter/free" || value.endsWith(":free");

  const act = (key: string, fn: () => Promise<string>) =>
    start(async () => {
      setBusy(key);
      setMessage(null);
      try {
        setMessage({ tone: "accent", text: await fn() });
        router.refresh();
      } catch (e) {
        setMessage({ tone: "danger", text: friendlyError(e) });
      } finally {
        setBusy("");
      }
    });

  if (!connected) {
    return (
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <h2 className="font-medium">Turn on AI — free</h2>
              <Badge tone="accent">Recommended</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              Connect your own OpenRouter account. You approve OpenApply on OpenRouter&apos;s site — you never copy or paste a
              key — and can set a spending limit or disconnect there at any time. Free models cost nothing: about 50 AI
              actions a day, or 1,000 a day after a one-time $10 credit purchase.
            </p>
          </div>
          <a
            href="/api/openrouter/connect"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-ink-fg shadow-[0_6px_16px_rgba(21,32,26,0.16)] hover:opacity-95"
          >
            Connect with OpenRouter
          </a>
        </div>
        {message && (
          <div className="mt-4">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-accent" />
          <h2 className="font-medium">Connected to OpenRouter</h2>
        </div>
        <a
          href="https://openrouter.ai/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
        >
          Spending limit & key settings <ExternalLink size={12} />
        </a>
      </div>

      <form
        className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          act("model", async () => {
            const r = await setAIModelAction(value);
            if (!r.ok) throw new Error(r.error);
            const t = await testAIKeyAction();
            if (!t.ok) throw new Error(`Saved, but the test failed: ${t.error}`);
            return `Model saved. ${t.data}.`;
          });
        }}
      >
        <div>
          <Label htmlFor="or-model" hint="Auto is free and most reliable">
            Model
          </Label>
          <Input id="or-model" list="or-models" value={value} onChange={(e) => setValue(e.target.value)} required />
          <datalist id="or-models">
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </datalist>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={!!busy} loading={busy === "model"}>
            {busy === "model" ? "Testing…" : "Save & test"}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!!busy}
            onClick={() =>
              act("disconnect", async () => {
                const r = await removeAIKeyAction();
                if (!r.ok) throw new Error(r.error);
                return "Disconnected. You can also delete the OpenApply key on OpenRouter's site.";
              })
            }
          >
            Disconnect
          </Button>
        </div>
      </form>

      <p className="mt-3 text-xs text-muted">
        {isFree ? (
          <>
            Free models are rate-limited (about 50 requests a day) and write less polished letters than paid ones. Some free
            providers may log prompts, and your resume is part of them — control this in{" "}
            <a href="https://openrouter.ai/settings/privacy" target="_blank" rel="noopener noreferrer" className="underline">
              OpenRouter privacy settings
            </a>
            . If a free model is busy, OpenApply automatically falls back to another free one.
          </>
        ) : (
          <>Paid models are billed to your OpenRouter credits. Set a spending limit on your key to stay in control.</>
        )}
      </p>

      <ProgressSteps className="mt-4" active={busy === "model"} steps={STEPS.test} />
      {message && !busy && (
        <div className="mt-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
    </Card>
  );
}
