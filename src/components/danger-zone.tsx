"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/(app)/actions";
import { Button, Card, Input, Notice } from "@/components/ui";

export function DangerZone({ email }: { email: string }) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <Card className="p-5">
      <h2 className="font-medium">Account</h2>
      <p className="mt-1 text-sm text-muted">Signed in as {email}.</p>
      <form action="/auth/signout" method="post" className="mt-3">
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm font-medium text-danger">Delete account</p>
        <p className="mt-1 text-sm text-muted">
          Permanently deletes your profile, resume, applications, AI key and autopilot searches. Type DELETE to confirm.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input className="max-w-40" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" />
          <Button
            variant="danger"
            disabled={confirm !== "DELETE" || pending}
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
