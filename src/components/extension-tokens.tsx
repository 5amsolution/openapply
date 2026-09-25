"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Puzzle } from "lucide-react";
import { createExtensionTokenAction, revokeExtensionTokenAction } from "@/app/(app)/actions";
import { Button, Card, Input, Notice } from "@/components/ui";
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
    <Card className="p-5" id="extension">
      <div className="mb-1 flex items-center gap-2">
        <Puzzle size={16} className="text-accent" />
        <h2 className="font-medium">Autofill browser extension</h2>
      </div>
      <p className="mb-4 text-sm text-muted">
        The extension fills application forms (Greenhouse, Lever, Ashby, Workday, SmartRecruiters and most others) with your
        profile and the tailored answers for that job. Install it from the <code>extension/</code> folder of the repository
        (Chrome → Extensions → Developer mode → Load unpacked), then paste a token below into it.
      </p>

      {newToken && (
        <div className="mb-4 grid gap-2">
          <Notice tone="accent">
            Copy this token now — it won’t be shown again. Server URL: <code>{origin}</code>
          </Notice>
          <Input readOnly value={newToken} onFocus={(e) => e.currentTarget.select()} className="font-mono" />
        </div>
      )}

      {tokens.length > 0 && (
        <ul className="mb-4 divide-y divide-border rounded-lg border border-border">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <p>{t.label}</p>
                <p className="text-xs text-muted">
                  Created {timeAgo(t.created_at)} · {t.last_used_at ? `last used ${timeAgo(t.last_used_at)}` : "never used"}
                </p>
              </div>
              <Button
                variant="ghost"
                className="text-danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await revokeExtensionTokenAction(t.id);
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
        className="flex flex-wrap gap-2"
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
        <Input className="max-w-xs" placeholder="Label, e.g. Work laptop" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={pending}>
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
