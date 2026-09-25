"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { saveJobAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui";

export function SaveJobButton({ jobId }: { jobId: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <Button
      variant="secondary"
      className="px-2.5 py-1 text-xs"
      disabled={pending || saved}
      title={error || undefined}
      onClick={() =>
        start(async () => {
          const res = await saveJobAction(jobId);
          if (res.ok) setSaved(true);
          else setError(res.error);
        })
      }
    >
      {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
      {saved ? "Saved" : error ? "Retry" : "Save"}
    </Button>
  );
}
