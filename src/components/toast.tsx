"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, PartyPopper, X } from "lucide-react";
import { cn } from "@/components/ui";

// Lightweight toasts: call toast("Saved") from any client component.

type Tone = "success" | "error" | "info" | "celebrate";
type Item = { id: number; text: string; tone: Tone; href?: string; action?: string };

const EVENT = "openapply:toast";
let seq = 0;

export function toast(text: string, opts: { tone?: Tone; href?: string; action?: string } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Item>(EVENT, { detail: { id: ++seq, text, tone: opts.tone ?? "success", href: opts.href, action: opts.action } }));
}

const ICON = { success: CheckCircle2, error: CircleAlert, info: Info, celebrate: PartyPopper };
const ICON_TONE = { success: "text-success", error: "text-danger", info: "text-info", celebrate: "text-primary-text" };

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<Item>).detail;
      setItems((prev) => [...prev.slice(-2), item]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), item.tone === "error" ? 7000 : 4500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      {items.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg shadow-lg",
              "animate-[oa-toast_280ms_cubic-bezier(0.22,1,0.36,1)]",
            )}
          >
            <Icon size={18} className={cn("shrink-0", ICON_TONE[t.tone])} aria-hidden="true" />
            <span className="flex-1">{t.text}</span>
            {t.href && (
              <a href={t.href} className="shrink-0 rounded-lg px-2 py-1 font-semibold text-primary-text hover:bg-primary-soft">
                {t.action ?? "View"}
              </a>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
              onClick={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
