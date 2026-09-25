"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/components/ui";

// Light / dark / system switch. The choice lives in localStorage ("system"
// stores nothing) and is applied to <html data-theme> — the inline script in
// the root layout applies it before first paint on page loads.

type Theme = "light" | "dark" | "system";
const KEY = "oa-theme";
const EVENT = "oa-theme-change";

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  apply(theme);
  window.dispatchEvent(new Event(EVENT));
}

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle({ labels = false, className }: { labels?: boolean; className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  // In development React remounts <html> and drops the attribute the inline script set.
  useLayoutEffect(() => apply(read()), []);

  return (
    <div role="group" aria-label="Colour theme" className={cn("inline-flex gap-1 rounded-xl border border-border bg-surface-2 p-1", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            aria-label={labels ? undefined : `${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-lg font-semibold transition duration-150",
              labels ? "h-10 px-3 text-sm" : "h-8 px-2 text-[13px]",
              on ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            <Icon size={labels ? 16 : 15} aria-hidden="true" />
            {labels && label}
          </button>
        );
      })}
    </div>
  );
}
