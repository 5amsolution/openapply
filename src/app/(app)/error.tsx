"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button, ButtonLink, IconTile } from "@/components/ui";
import { friendlyError } from "@/components/progress";

// Friendly fallback when a page fails to load (network hiccup, deploy in progress…).
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <IconTile tone="warn" size="lg">
        <RefreshCw size={22} />
      </IconTile>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-fg">That didn&apos;t load</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {error.digest
          ? "Something went wrong on our side. Your data is safe, so please try again in a moment."
          : friendlyError(error)}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </Button>
        <ButtonLink href="/dashboard" variant="secondary">
          Go to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
