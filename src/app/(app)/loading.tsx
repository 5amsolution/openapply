import { Card } from "@/components/ui";

// Shown instantly while any app page loads, so navigation never looks frozen.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary-soft">
        <div className="h-full w-1/3 animate-[oa-slide_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <span className="sr-only">Loading…</span>
      <div className="mb-8 flex items-center gap-4">
        <div className="skeleton hidden h-12 w-12 rounded-2xl sm:block" />
        <div className="grid flex-1 gap-2.5">
          <div className="skeleton h-3.5 w-28 rounded-md" />
          <div className="skeleton h-7 w-64 max-w-full rounded-lg" />
          <div className="skeleton h-4 w-96 max-w-full rounded-md" />
        </div>
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex gap-4 p-5">
            <div className="skeleton h-12 w-12 rounded-xl" />
            <div className="grid flex-1 content-start gap-2.5">
              <div className="skeleton h-4 w-1/2 rounded-md" />
              <div className="skeleton h-3.5 w-1/3 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
