"use client";

import { useState } from "react";
import { SOFT, cn, initialsOf, type Tone } from "@/components/ui";

const TONES: Tone[] = ["primary", "violet", "pink", "info", "success", "warn"];

/** Company logo with a coloured-initials fallback (many boards block hotlinked logos). */
export function CompanyLogo({ src, company, size = 44 }: { src: string | null; company: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const tone = TONES[[...company].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TONES.length];
  const showImage = src && !broken;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border font-extrabold tracking-tight",
        showImage ? "bg-white" : SOFT[tone],
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.32)) }}
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain p-1" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        initialsOf(company)
      )}
    </div>
  );
}
