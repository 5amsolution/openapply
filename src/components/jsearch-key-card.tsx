"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Globe } from "lucide-react";
import { removeJSearchKeyAction, saveJSearchKeyAction } from "@/app/(app)/actions";
import { Badge, Button, Card, FieldHint, IconTile, Input, Label, Notice } from "@/components/ui";
import { ProgressSteps, friendlyError } from "@/components/progress";

type Info = { key_hint: string | null; monthly_limit: number; usedThisMonth: number } | null;

export function JSearchKeyCard({ info, siteKeyAvailable }: { info: Info; siteKeyAvailable: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [limit, setLimit] = useState(String(info?.monthly_limit ?? 190));
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
        <IconTile tone="info">
          <Globe size={18} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-fg">LinkedIn, Indeed & Glassdoor jobs</h3>
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
          <p className="mt-1 text-sm leading-relaxed text-muted">
            These come from JSearch, which gathers listings from LinkedIn, Indeed, Glassdoor and more. Add your own free key and
            your searches use your own 200 requests a month — results from your key are visible only to you.
          </p>
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
            aria-label="Requests used this month"
            aria-valuemin={0}
            aria-valuemax={cap}
            aria-valuenow={used}
          >
            <div className={`h-full rounded-full ${pct > 85 ? "bg-warn" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[13px] text-muted">Each new search uses one request; repeating a search within a day is free.</p>
        </div>
      )}

      {!info && (
        <ol className="mb-5 grid gap-2.5 rounded-xl bg-surface-2 p-4 text-sm text-fg">
          <li className="flex gap-3">
            <Step n={1} />
            <span>
              Open{" "}
              <a
                href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary-text underline underline-offset-2"
              >
                JSearch on RapidAPI <ExternalLink size={13} aria-hidden="true" />
              </a>{" "}
              and sign up (Google works).
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <span>
              Subscribe to the free <b>Basic</b> plan — no card needed.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <span>
              Copy the <b>X-RapidAPI-Key</b> from the code example and paste it below.
            </span>
          </li>
        </ol>
      )}

      <form
        className="grid gap-4 md:grid-cols-[1fr_10rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void run("save", async () => {
            const r = await saveJSearchKeyAction({ key: key || undefined, monthlyLimit: Number(limit) || 190 });
            if (!r.ok) throw new Error(r.error);
            return r.data;
          });
        }}
      >
        <div>
          <Label htmlFor="js-key" hint={info ? "leave blank to keep your key" : undefined}>
            X-RapidAPI-Key
          </Label>
          <Input id="js-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your key" required={!info} />
        </div>
        <div>
          <Label htmlFor="js-limit" hint="safety cap">
            Monthly limit
          </Label>
          <Input id="js-limit" type="number" min={1} max={100000} value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" loading={busy === "save"}>
            {key || !info ? "Save & test" : "Update limit"}
          </Button>
          {info && (
            <Button
              type="button"
              variant="danger"
              loading={busy === "remove"}
              onClick={() =>
                void run("remove", async () => {
                  const r = await removeJSearchKeyAction();
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
          { label: "Checking your key with JSearch (uses 1 request)", after: 0 },
          { label: "Waiting for JSearch to answer", after: 4 },
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
