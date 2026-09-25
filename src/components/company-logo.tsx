"use client";

import { useState } from "react";

const PALETTE = ["#e2ebc9", "#f9d9e9", "#fbf1e6", "#e6e5f6", "#dfe9ee", "#dcefc2", "#fde2cf"];

/** Company logo with a coloured-initials fallback (many boards block hotlinked logos). */
export function CompanyLogo({ src, company, size = 44 }: { src: string | null; company: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials =
    company
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  const hue = [...company].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length;

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-extrabold tracking-tight text-[#15201a]"
      style={{ width: size, height: size, background: src && !broken ? "#fff" : PALETTE[hue] }}
      aria-hidden="true"
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain p-1" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        initials
      )}
    </div>
  );
}
