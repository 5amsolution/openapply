import { Card } from "@/components/ui";

// Shown instantly while any app page loads, so navigation never looks frozen.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent/15">
        <div className="h-full w-1/3 animate-[oa-slide_1.1s_ease-in-out_infinite] bg-accent" />
      </div>
      <span className="sr-only">Loading…</span>
      <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-surface-2" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-surface-2/60" />
        ))}
      </div>
    </div>
  );
}
