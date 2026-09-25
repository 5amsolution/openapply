"use client";

import { useState } from "react";

/** Source checkboxes that submit as a single comma-separated "src" field (empty = all). */
export function SourceFilter({ sources, selected }: { sources: { id: string; label: string }[]; selected: string[] }) {
  const [on, setOn] = useState<string[]>(selected.length ? selected : sources.map((s) => s.id));
  const partial = on.length > 0 && on.length < sources.length;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {sources.map((s) => (
        <label key={s.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={on.includes(s.id)}
            onChange={(e) => setOn((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          {s.label}
        </label>
      ))}
      {partial && <input type="hidden" name="src" value={on.join(",")} />}
    </div>
  );
}
