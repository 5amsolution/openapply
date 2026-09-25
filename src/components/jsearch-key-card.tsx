"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Globe } from "lucide-react";
import { removeJSearchKeyAction, saveJSearchKeyAction } from "@/app/(app)/actions";
import { Badge, Button, Card, Input, Label, Notice } from "@/components/ui";
import { ProgressSteps, friendlyError } from "@/components/progress";

type Info = { key_hint: string | null; monthly_limit: number; usedThisMonth: number } | null;

export function JSearchKeyCard({ info, siteKeyAvailable }: { info: Info; siteKeyAvailable: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [limit, setLimit] = useState(String(info?.monthly_limit ?? 190));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ tone: "accent" | "danger"; text: string } | null>(null);

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    setMessage(null);
    try {
      setMessage({ tone: "accent", text: await fn() });
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

  return (
    <Card className="p-5" id="job-sources">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Globe size={16} className="text-accent" />
        <h2 className="font-medium">LinkedIn, Indeed & Glassdoor jobs</h2>
        {info ? (
          <Badge tone="accent">
            <CheckCircle2 size={12} /> Your key is connected
          </Badge>
        ) : siteKeyAvailable ? (
          <Badge>Using the site&apos;s shared key</Badge>
        ) : (
          <Badge>Not connected</Badge>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">
        These come from JSearch, which gathers listings from LinkedIn, Indeed, Glassdoor and more. Add your own free key and
        your searches use your own 200 requests a month — results from your key are visible only to you.
      </p>

      {info && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>
              {used} of {cap} requests used this month
            </span>
            <span>key {info.key_hint}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (used / Math.max(cap, 1)) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">Each new search uses one request; repeating a search within a day is free.</p>
        </div>
      )}

      {!info && (
        <ol className="mb-4 grid gap-1 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
          <li>
            1. Open{" "}
            <a
              href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              JSearch on RapidAPI <ExternalLink size={12} />
            </a>{" "}
            and sign up (Google works).
          </li>
          <li>2. Subscribe to the free <b>Basic</b> plan — no card needed.</li>
          <li>3. Copy the <b>X-RapidAPI-Key</b> from the code example and paste it below.</li>
        </ol>
      )}

      <form
        className="grid gap-3 md:grid-cols-[1fr_10rem_auto]"
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
