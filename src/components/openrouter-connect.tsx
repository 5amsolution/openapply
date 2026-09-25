"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { removeAIKeyAction, setAIModelAction, testAIKeyAction } from "@/app/(app)/actions";
import { Badge, Button, Card, IconTile, Input, Label, Notice, buttonClass } from "@/components/ui";
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
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(
    status === "connected"
      ? { tone: "success", text: "Connected! You're using a free model. No card needed." }
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
        setMessage({ tone: "success", text: await fn() });
        router.refresh();
      } catch (e) {
        setMessage({ tone: "danger", text: friendlyError(e) });
      } finally {
        setBusy("");
      }
    });

  if (!connected) {
    return (
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <IconTile tone="primary">
                <Sparkles size={18} />
              </IconTile>
              <h3 className="text-lg font-bold tracking-tight text-fg">Turn on AI for free</h3>
              <Badge tone="success">Recommended</Badge>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Connect your own OpenRouter account. You approve 5AM Apply on OpenRouter&apos;s site, with nothing to copy or paste, and
              free models cost nothing: about 50 AI actions a day, or 1,000 a day after a one-time $10 credit purchase.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-fg sm:grid-cols-3">
              {["No card needed", "No keys to copy", "Disconnect any time"].map((t) => (
                <li key={t} className="flex items-center gap-2 font-medium">
                  <Check size={16} aria-hidden="true" className="shrink-0 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <a href="/api/openrouter/connect" className={buttonClass("primary", "lg")}>
            <Sparkles size={17} aria-hidden="true" /> Connect with OpenRouter
          </a>
        </div>
        {message && (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconTile tone="success">
            <CheckCircle2 size={19} />
          </IconTile>
          <div>
            <h3 className="text-base font-bold tracking-tight text-fg">Connected to OpenRouter</h3>
            <p className="text-sm text-muted">AI is on. Fit scores and applications are ready to go.</p>
          </div>
        </div>
        <a
          href="https://openrouter.ai/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("ghost", "sm")}
        >
          Spending limit & key settings <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <form
        className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"
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
                return "Disconnected. You can also delete the 5AM Apply key on OpenRouter's site.";
              })
            }
          >
            Disconnect
          </Button>
        </div>
      </form>

      <p className="mt-4 text-[13px] leading-relaxed text-muted">
        {isFree ? (
          <>
            Free models are rate-limited (about 50 requests a day) and write less polished letters than paid ones. Some free
            providers may log prompts, and your resume is part of them. Control this in{" "}
            <a href="https://openrouter.ai/settings/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-text underline underline-offset-2">
              OpenRouter privacy settings
            </a>
            . If a free model is busy, 5AM Apply automatically falls back to another free one.
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
