"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Globe, Rocket } from "lucide-react";
import { removeSourceKeyAction, saveSourceKeyAction } from "@/app/(app)/actions";
import { Badge, Button, Card, FieldHint, IconTile, Input, Label, Notice } from "@/components/ui";
import { ProgressSteps, friendlyError } from "@/components/progress";

type Info = { key_hint: string | null; monthly_limit: number; usedThisMonth: number } | null;
type Source = "jsearch" | "remoterocketship";

const LINK = "inline-flex items-center gap-1 font-semibold text-primary-text underline underline-offset-2";

const CONFIG: Record<
  Source,
  { title: string; icon: ReactNode; about: string; name: string; keyLabel: string; idPrefix: string; defaultLimit: number; usageNote: string; steps: ReactNode[] }
> = {
  jsearch: {
    title: "LinkedIn, Indeed & Glassdoor jobs",
    icon: <Globe size={18} />,
    about:
      "These come from JSearch, which gathers listings from LinkedIn, Indeed, Glassdoor, Wellfound and more. Add your own free key and your searches use your own 200 requests a month. Results from your key are visible only to you.",
    name: "JSearch",
    keyLabel: "X-RapidAPI-Key",
    idPrefix: "js",
    defaultLimit: 190,
    usageNote: "Each new search uses one request; repeating a search within a day is free.",
    steps: [
      <>
        Open{" "}
        <a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing" target="_blank" rel="noopener noreferrer" className={LINK}>
          JSearch on RapidAPI <ExternalLink size={13} aria-hidden="true" />
        </a>{" "}
        and sign up (Google works).
      </>,
      <>
        Subscribe to the free <b>Basic</b> plan. No card needed.
      </>,
      <>
        Copy the <b>X-RapidAPI-Key</b> from the code example and paste it below.
      </>,
    ],
  },
  remoterocketship: {
    title: "Remote Rocketship jobs",
    icon: <Rocket size={18} />,
    about:
      "Remote Rocketship lists 180,000+ remote jobs. Its API needs a Remote Rocketship subscription; with your key, your searches include its listings (up to 50 per search). Results from your key are visible only to you.",
    name: "Remote Rocketship",
    keyLabel: "Remote Rocketship API key",
    idPrefix: "rr",
    defaultLimit: 3000,
    usageNote: "Each new search uses one request (the API allows 500 a day); repeating a search within 12 hours is free.",
    steps: [
      <>
        Sign in to{" "}
        <a href="https://www.remoterocketship.com/api-docs" target="_blank" rel="noopener noreferrer" className={LINK}>
          Remote Rocketship <ExternalLink size={13} aria-hidden="true" />
        </a>{" "}
        with an active subscription.
      </>,
      <>
        Open <b>Advanced</b>, then <b>API access</b>, and generate a key.
      </>,
      <>It&apos;s shown once. Paste it below.</>,
    ],
  },
};

export function SourceKeyCard({ source, info, siteKeyAvailable }: { source: Source; info: Info; siteKeyAvailable: boolean }) {
  const c = CONFIG[source];
  const router = useRouter();
  const [key, setKey] = useState("");
  const [limit, setLimit] = useState(String(info?.monthly_limit ?? c.defaultLimit));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    setMessage(null);
    try {
      setMessage({ tone: "success", text: await fn() });
      setKey("");
      router.refresh();
    } catch (e) {
      setMessage({ tone: "danger", text: friendlyError(e) });
    } finally {
      setBusy("");
    }
  };

  const used = info?.usedThisMonth ?? 0;
  const cap = info?.monthly_limit ?? 0;
  const pct = Math.min(100, (used / Math.max(cap, 1)) * 100);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <IconTile tone="primary">{c.icon}</IconTile>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-fg">{c.title}</h3>
            {info ? (
              <Badge tone="success">
                <CheckCircle2 size={12} aria-hidden="true" /> Your key is connected
              </Badge>
            ) : siteKeyAvailable ? (
              <Badge>Using the site&apos;s shared key</Badge>
            ) : (
              <Badge>Not connected</Badge>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">{c.about}</p>
        </div>
      </div>

      {info && (
        <div className="mb-5 rounded-xl bg-surface-2 p-4">
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-semibold text-fg">
              {used} of {cap} requests used this month
            </span>
            <span className="font-mono text-[13px] text-muted">key {info.key_hint}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-label={`${c.name} requests used this month`}
            aria-valuemin={0}
            aria-valuemax={cap}
            aria-valuenow={used}
          >
            <div className={`h-full rounded-full ${pct > 85 ? "bg-warn" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[13px] text-muted">{c.usageNote}</p>
        </div>
      )}

      {!info && (
        <ol className="mb-5 grid gap-2.5 rounded-xl bg-surface-2 p-4 text-sm text-fg">
          {c.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <Step n={i + 1} />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      <form
        className="grid gap-4 md:grid-cols-[1fr_10rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void run("save", async () => {
            const r = await saveSourceKeyAction(source, { key: key || undefined, monthlyLimit: Number(limit) || c.defaultLimit });
            if (!r.ok) throw new Error(r.error);
            return r.data;
          });
        }}
      >
        <div>
          <Label htmlFor={`${c.idPrefix}-key`} hint={info ? "leave blank to keep your key" : undefined}>
            {c.keyLabel}
          </Label>
          <Input
            id={`${c.idPrefix}-key`}
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your key"
            required={!info}
          />
        </div>
        <div>
          <Label htmlFor={`${c.idPrefix}-limit`} hint="safety cap">
            Monthly limit
          </Label>
          <Input id={`${c.idPrefix}-limit`} type="number" min={1} max={100000} value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" loading={busy === "save"} aria-label={`${key || !info ? "Save & test" : "Update limit"} ${c.name} key`}>
            {key || !info ? "Save & test" : "Update limit"}
          </Button>
          {info && (
            <Button
              type="button"
              variant="danger"
              loading={busy === "remove"}
              aria-label={`Remove ${c.name} key`}
              onClick={() =>
                void run("remove", async () => {
                  const r = await removeSourceKeyAction(source);
                  if (!r.ok) throw new Error(r.error);
                  return "Key removed.";
                })
              }
            >
              Remove
            </Button>
          )}
        </div>
      </form>
      {!info && <FieldHint>We test the key once (1 request) before saving it. It&apos;s stored encrypted.</FieldHint>}

      <ProgressSteps
        className="mt-4"
        active={busy === "save" && !!key}
        steps={[
          { label: `Checking your key with ${c.name} (uses 1 request)`, after: 0 },
          { label: `Waiting for ${c.name} to answer`, after: 4 },
        ]}
      />
      {message && !busy && (
        <div className="mt-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
    </Card>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-fg" aria-hidden="true">
      {n}
    </span>
  );
}
