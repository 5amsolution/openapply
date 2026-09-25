"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/components/ui";

/** Source toggles that submit as a single comma-separated "src" field (empty = all). */
export function SourceFilter({ sources, selected }: { sources: { id: string; label: string }[]; selected: string[] }) {
  const [on, setOn] = useState<string[]>(selected.length ? selected : sources.map((s) => s.id));
  const partial = on.length > 0 && on.length < sources.length;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((s) => {
        const checked = on.includes(s.id);
        return (
          <label
            key={s.id}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
              checked ? "border-transparent bg-primary-soft text-primary-soft-fg" : "border-border-strong bg-surface text-muted hover:text-fg",
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={(e) => setOn((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))}
            />
            {checked && <Check size={14} aria-hidden="true" />}
            {s.label}
          </label>
        );
      })}
      {partial && <input type="hidden" name="src" value={on.join(",")} />}
    </div>
  );
}
