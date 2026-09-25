"use client";

import { useState, useTransition } from "react";
import { LogOut, Trash2, UserRound } from "lucide-react";
import { deleteAccountAction } from "@/app/(app)/actions";
import { Button, Card, IconTile, Input, Label, Notice } from "@/components/ui";

export function DangerZone({ email }: { email: string }) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <Card className="divide-y divide-border">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile tone="neutral">
            <UserRound size={18} />
          </IconTile>
          <div className="min-w-0">
            <p className="text-base font-bold text-fg">Signed in</p>
            <p className="truncate text-sm text-muted">{email}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="secondary">
            <LogOut size={16} aria-hidden="true" /> Sign out
          </Button>
        </form>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <IconTile tone="danger">
            <Trash2 size={18} />
          </IconTile>
          <div>
            <h3 className="text-base font-bold text-danger">Delete account</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Permanently deletes your profile, resume, applications, AI key and autopilot searches. This can&apos;t be undone.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2 sm:pl-[52px]">
          <div className="w-44">
            <Label htmlFor="delete-confirm">
              Type <span className="font-mono">DELETE</span> to confirm
            </Label>
            <Input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" autoComplete="off" />
          </div>
          <Button
            variant="danger-solid"
            disabled={confirm !== "DELETE" || pending}
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteAccountAction(confirm);
                if (res && !res.ok) setError(res.error);
              })
            }
          >
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
        {error && (
          <div className="mt-3">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </div>
    </Card>
  );
}
