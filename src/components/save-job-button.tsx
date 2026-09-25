"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { saveJobAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui";
import { friendlyError } from "@/components/progress";
import { toast } from "@/components/toast";

export function SaveJobButton({ jobId }: { jobId: string }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await saveJobAction(jobId);
      if (!res.ok) throw new Error(res.error);
      setSaved(true);
      toast("Saved to your applications", { href: `/applications/${res.data.id}`, action: "Open" });
    } catch (e) {
      toast(friendlyError(e), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={saved ? "soft" : "secondary"} size="sm" aria-disabled={saved || undefined} loading={busy} onClick={() => !saved && void save()}>
      {!busy && (saved ? <BookmarkCheck size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />)}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
