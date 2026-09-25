"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationAction } from "@/app/(app)/actions";
import { Select, cn } from "@/components/ui";
import { friendlyError } from "@/components/progress";
import { toast } from "@/components/toast";
import { celebrate } from "@/lib/celebrate";
import { STATUS_LABELS } from "@/lib/format";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export function StatusSelect({ id, status, compact, inputId }: { id: string; status: ApplicationStatus; compact?: boolean; inputId?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  return (
    <Select
      id={inputId}
      aria-label="Status"
      value={value}
      disabled={busy}
      className={cn(compact && "h-9 rounded-lg text-[13px]")}
      onChange={async (e) => {
        const next = e.target.value as ApplicationStatus;
        const prev = value;
        setValue(next);
        setBusy(true);
        try {
          const res = await updateApplicationAction(id, { status: next });
          if (!res.ok) throw new Error(res.error);
          if (next === "offer" || next === "interviewing") {
            celebrate();
            toast(next === "offer" ? "An offer! Congratulations!" : "An interview! Nice work!", { tone: "celebrate" });
          } else toast(`Moved to ${STATUS_LABELS[next]}`);
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
