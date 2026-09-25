"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Puzzle } from "lucide-react";
import { createExtensionTokenAction, revokeExtensionTokenAction } from "@/app/(app)/actions";
import { Button, Card, IconTile, Input, Label, Notice } from "@/components/ui";
import { toast } from "@/components/toast";
import { timeAgo } from "@/lib/format";

export function ExtensionTokens({
  tokens,
  siteUrl,
}: {
  tokens: { id: string; label: string; created_at: string; last_used_at: string | null }[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [newToken, setNewToken] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const origin = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <IconTile tone="primary">
          <Puzzle size={18} />
        </IconTile>
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-fg">Autofill browser extension</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Fills application forms (Greenhouse, Lever, Ashby, Workday, SmartRecruiters and most others) with your profile and
            the tailored answers for that job. Install it from the <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[13px] text-fg">extension/</code>{" "}
            folder of the repository (Chrome → Extensions → Developer mode → Load unpacked), then paste a token below into it.
          </p>
        </div>
      </div>

      {newToken && (
        <div className="mb-5 grid gap-2">
          <Notice tone="success" title="Copy this token now — it won’t be shown again.">
            Server URL: <code className="font-mono">{origin}</code>
          </Notice>
          <Input readOnly value={newToken} onFocus={(e) => e.currentTarget.select()} className="bg-surface-2 font-mono text-sm" aria-label="New extension token" />
        </div>
      )}

      {tokens.length > 0 && (
        <ul className="mb-5 divide-y divide-border rounded-xl border border-border">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <KeyRound size={16} aria-hidden="true" className="shrink-0 text-muted" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{t.label}</p>
                  <p className="text-[13px] text-muted">
                    Created {timeAgo(t.created_at)} · {t.last_used_at ? `last used ${timeAgo(t.last_used_at)}` : "never used"}
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await revokeExtensionTokenAction(t.id);
                    toast("Token revoked");
                    router.refresh();
                  })
                }
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError("");
            const res = await createExtensionTokenAction(label);
            if (!res.ok) return setError(res.error);
            setNewToken(res.data);
            setLabel("");
            router.refresh();
          });
        }}
      >
        <div className="min-w-0 sm:w-72">
          <Label htmlFor="token-label" hint="optional">
            Name this device
          </Label>
          <Input id="token-label" placeholder="e.g. Work laptop" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" loading={pending} className="self-start sm:self-auto">
          Create token
        </Button>
      </form>
      {error && (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </Card>
  );
}
