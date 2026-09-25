"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationAction } from "@/app/(app)/actions";
import { Select, cn } from "@/components/ui";
import { friendlyError } from "@/components/progress";
import { toast } from "@/components/toast";
import { STATUS_LABELS } from "@/lib/format";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export function StatusSelect({ id, status, compact }: { id: string; status: ApplicationStatus; compact?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  return (
    <Select
      aria-label="Status"
      value={value}
      disabled={busy}
      className={cn(compact && "py-1 text-xs")}
      onChange={async (e) => {
        const next = e.target.value as ApplicationStatus;
        const prev = value;
        setValue(next);
        setBusy(true);
        try {
          const res = await updateApplicationAction(id, { status: next });
          if (!res.ok) throw new Error(res.error);
          toast(`Moved to ${STATUS_LABELS[next]}`);
          router.refresh();
        } catch (err) {
          setValue(prev);
          toast(friendlyError(err), { tone: "error" });
        } finally {
          setBusy(false);
        }
      }}
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
