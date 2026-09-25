"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationAction } from "@/app/(app)/actions";
import { Select, cn } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/format";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export function StatusSelect({ id, status, compact }: { id: string; status: ApplicationStatus; compact?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();

  return (
    <Select
      aria-label="Status"
      value={value}
      disabled={pending}
      className={cn(compact && "py-1 text-xs")}
      onChange={(e) => {
        const next = e.target.value as ApplicationStatus;
        const prev = value;
        setValue(next);
        start(async () => {
          const res = await updateApplicationAction(id, { status: next });
          if (!res.ok) setValue(prev);
          router.refresh();
        });
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
