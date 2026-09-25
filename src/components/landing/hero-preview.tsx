import { Check, CircleDot, MapPin, Search, Send, Sparkles } from "lucide-react";
import { ScoreRing, SOFT, cn, type Tone } from "@/components/ui";

// A pure-HTML preview of the app for the landing hero: results on the left,
// the fit score and a ready application on the right. Companies are fictional.
// Decorative, so it's hidden from screen readers.

const JOBS: { title: string; company: string; initials: string; tone: Tone; place: string; fit: number; fitTone: Tone }[] = [
  { title: "Senior Product Designer", company: "Northwind", initials: "NW", tone: "violet", place: "Remote, Europe", fit: 92, fitTone: "success" },
  { title: "Product Designer, Growth", company: "Lumen Labs", initials: "LL", tone: "info", place: "Berlin, Hybrid", fit: 84, fitTone: "success" },
  { title: "UX Designer", company: "Brightpath", initials: "BP", tone: "pink", place: "Remote, Worldwide", fit: 71, fitTone: "primary" },
  { title: "Design Systems Lead", company: "Acme Co.", initials: "AC", tone: "primary", place: "London", fit: 66, fitTone: "primary" },
];

export function HeroPreview() {
  return (
    <div className="relative w-full" aria-hidden="true">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
          <span className="ml-3 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-field px-3 text-[13px] text-muted">
            <Search size={13} className="shrink-0" />
            <span className="truncate">product designer, remote</span>
          </span>
        </div>

        <div className="grid md:grid-cols-[1.15fr_1fr]">
          {/* Results */}
          <div className="grid content-start gap-2 p-4">
            <p className="px-1 pb-1 text-[13px] font-semibold text-fg">148 jobs, best match first</p>
            {JOBS.map((j, i) => (
              <div
                key={j.title}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5",
                  i === 0 ? "border-primary bg-surface ring-2 ring-ring" : "border-border bg-surface",
                )}
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-extrabold", SOFT[j.tone])}>{j.initials}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-fg">{j.title}</p>
                  <p className="flex items-center gap-1 truncate text-[12px] text-muted">
                    {j.company} <MapPin size={10} className="shrink-0" /> {j.place}
                  </p>
                </div>
                <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] font-bold", SOFT[j.fitTone])}>{j.fit}%</span>
              </div>
            ))}
          </div>

          {/* Fit and application */}
          <div className="hidden border-l border-border bg-surface-2 p-4 md:grid md:content-start md:gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <ScoreRing score={92} size={52} />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-fg">Strong match</p>
                <ul className="mt-1 grid gap-0.5 text-[12px] text-muted">
                  <li className="flex items-center gap-1.5">
                    <Check size={12} strokeWidth={3} className="text-success" /> Design systems
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check size={12} strokeWidth={3} className="text-success" /> 5 years in product
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CircleDot size={12} className="text-warn" /> Mention a B2B project
                  </li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-primary-text">
                <Sparkles size={12} /> Cover letter ready
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-fg">
                Hi Northwind team, I&apos;ve spent five years designing tools people enjoy using every day, and your design system role is
                exactly where I do my best work.
              </p>
            </div>
            <span className="bg-brand inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold text-primary-fg">
              <Send size={13} /> Apply now
            </span>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-11 left-4 flex items-center gap-3 rounded-2xl bg-fg py-2.5 pl-2.5 pr-4 text-bg shadow-lg sm:-left-5">
        <span className="bg-brand flex h-8 w-8 items-center justify-center rounded-full text-primary-fg">
          <Check size={16} strokeWidth={3} />
        </span>
        <div>
          <p className="text-[13px] font-bold">3 applications ready</p>
          <p className="text-[12px] opacity-80">Written by Autopilot overnight</p>
        </div>
      </div>
    </div>
  );
}
