import { Check, CircleDot, MapPin, Search, Sparkles } from "lucide-react";
import { ScoreRing, SOFT, cn, type Tone } from "@/components/ui";

// A lightweight, pure-HTML preview of the app for the landing hero.
// Companies are fictional. Decorative: hidden from screen readers.

const JOBS: { title: string; company: string; initials: string; tone: Tone; place: string; fit: number; fitTone: Tone }[] = [
  { title: "Senior Product Designer", company: "Northwind", initials: "NW", tone: "violet", place: "Remote · Europe", fit: 92, fitTone: "success" },
  { title: "Product Designer, Growth", company: "Lumen Labs", initials: "LL", tone: "info", place: "Berlin · Hybrid", fit: 84, fitTone: "success" },
  { title: "UX Designer", company: "Brightpath", initials: "BP", tone: "pink", place: "Remote · Worldwide", fit: 71, fitTone: "primary" },
];

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] pb-28 pt-4 text-left sm:pb-24 sm:pt-10" aria-hidden="true">
      {/* App window */}
      <div className="relative rounded-2xl border border-border bg-surface shadow-lg">
        <div className="flex items-center gap-2 rounded-t-2xl border-b border-border bg-surface-2 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
          <span className="ml-3 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] text-muted">
            <Search size={13} className="shrink-0" />
            <span className="truncate">product designer · remote</span>
          </span>
        </div>
        <div className="grid gap-2.5 p-4">
          <p className="px-1 text-[13px] font-semibold text-fg">148 jobs · sorted by best match</p>
          {JOBS.map((j, i) => (
            <div
              key={j.title}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                i === 0 ? "border-primary bg-surface shadow-md ring-4 ring-ring" : "border-border bg-surface",
              )}
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold", SOFT[j.tone])}>{j.initials}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-fg">{j.title}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted">
                  {j.company} · <MapPin size={11} className="shrink-0" /> {j.place}
                </p>
              </div>
              <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold", SOFT[j.fitTone])}>{j.fit}% fit</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fit card */}
      <div className="absolute -right-3 -top-4 hidden w-56 rounded-2xl border border-border bg-surface p-4 shadow-lg animate-[oa-float_7s_ease-in-out_infinite] sm:block lg:-right-8">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Your fit</p>
        <div className="mt-2 flex items-center gap-3">
          <ScoreRing score={92} size={50} />
          <p className="text-sm font-bold leading-snug text-fg">Strong match for Northwind</p>
        </div>
        <ul className="mt-3 grid gap-1.5 text-xs text-fg">
          <li className="flex items-center gap-2">
            <Check size={14} className="shrink-0 text-success" strokeWidth={3} /> Design systems in Figma
          </li>
          <li className="flex items-center gap-2">
            <Check size={14} className="shrink-0 text-success" strokeWidth={3} /> 5 years in product teams
          </li>
          <li className="flex items-center gap-2">
            <CircleDot size={14} className="shrink-0 text-warn" /> Mention a B2B project
          </li>
        </ul>
      </div>

      {/* Cover letter card */}
      <div className="absolute bottom-6 -left-2 w-[72%] max-w-72 rounded-2xl border border-border bg-surface p-4 shadow-lg animate-[oa-float_8s_ease-in-out_1.2s_infinite] sm:bottom-2 sm:-left-8">
        <p className="flex items-center gap-2 text-xs font-bold text-primary-text">
          <Sparkles size={14} /> Writing your cover letter
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-fg">
          Hi Northwind team — I&apos;ve spent five years designing tools people genuinely enjoy using, and your design-system role
          is exactly where I do my best work
          <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-primary animate-[oa-caret_1s_steps(1)_infinite]" />
        </p>
      </div>

      {/* Toast */}
      <div className="absolute -bottom-2 right-0 flex items-center gap-3 rounded-2xl bg-fg py-3 pl-3 pr-4 text-bg shadow-lg animate-[oa-float_6s_ease-in-out_0.6s_infinite] sm:bottom-8 sm:-right-4">
        <span className="bg-brand flex h-8 w-8 items-center justify-center rounded-full text-primary-fg">
          <Check size={16} strokeWidth={3} />
        </span>
        <div>
          <p className="text-sm font-bold">3 applications ready</p>
          <p className="text-xs opacity-80">Written overnight by Autopilot</p>
        </div>
      </div>
    </div>
  );
}
