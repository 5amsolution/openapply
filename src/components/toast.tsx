"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/components/ui";

// Lightweight toasts: call toast("Saved") from any client component.

type Tone = "success" | "error" | "info";
type Item = { id: number; text: string; tone: Tone; href?: string; action?: string };

const EVENT = "openapply:toast";
let seq = 0;

export function toast(text: string, opts: { tone?: Tone; href?: string; action?: string } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Item>(EVENT, { detail: { id: ++seq, text, tone: opts.tone ?? "success", href: opts.href, action: opts.action } }));
}

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<Item>).detail;
      setItems((prev) => [...prev.slice(-2), item]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), item.tone === "error" ? 7000 : 4000);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      {items.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? CircleAlert : Info;
        return (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-ink-fg shadow-[0_12px_32px_rgba(0,0,0,0.22)]",
              "animate-[oa-toast_0.28s_cubic-bezier(0.16,1,0.3,1)]",
            )}
          >
            <Icon size={16} className={t.tone === "error" ? "text-[#ff9a8a]" : ""} />
            <span className="flex-1">{t.text}</span>
            {t.href && (
              <a href={t.href} className="font-semibold underline underline-offset-2">
                {t.action ?? "View"}
              </a>
            )}
            <button type="button" aria-label="Dismiss" className="opacity-70 hover:opacity-100" onClick={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
