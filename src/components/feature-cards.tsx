// "How it works" section — layout from the MotionSites "Core Features" template
// (gradient eyebrow, big title, cards with radial-gradient crowns and a small
// illustration each). Illustrations are drawn inline instead of remote SVGs.

const CARD = "relative flex h-[340px] flex-col justify-end overflow-hidden rounded-[20px] text-left shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)]";
const TITLE = "relative z-[2] p-6 text-[1.05rem] font-semibold text-[#1e293b]";
const BODY = "relative z-[2] -mt-4 px-6 pb-6 text-sm leading-relaxed text-[#475569]";
const WHITE = "rounded-xl bg-white shadow-[0_8px_20px_rgba(0,0,0,0.04)]";
const PILL = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black bg-white px-3.5 py-1 text-xs font-semibold text-[#1e293b] shadow-[0_4px_15px_rgba(0,0,0,0.08)]";

const crown = (a: string, b: string) => ({
  background: `radial-gradient(circle at 50% 0%, ${a} 0%, ${b} 30%, #F4F8F9 60%, #F4F8F9 100%)`,
});

function Cursor({ className }: { className: string }) {
  return (
    <svg className={`absolute z-10 h-6 w-6 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 2L20 11L11 13L9 22L4 2Z" fill="#0f172a" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

const hl = "bg-[linear-gradient(90deg,#FFB347,#E5A1F5)] bg-clip-text font-semibold text-transparent";

export function FeatureCards() {
  return (
    <section id="how" className="scroll-mt-6 bg-white px-5 py-20 text-center dark:bg-[#0e100f]">
      <div className="mx-auto max-w-[1100px]">
        <p className="mb-4 bg-[linear-gradient(90deg,#F5C344,#F28482,#B567C2)] bg-clip-text text-xs font-semibold uppercase tracking-[1px] text-transparent">
          How it works
        </p>
        <h2 className="mb-3 text-4xl font-medium tracking-[-0.02em] text-[#0f172a] sm:text-[2.75rem] dark:text-white">
          Built for speed &amp; quality
        </h2>
        <p className="mb-12 text-lg leading-normal text-[#64748b]">
          Everything you need to go
          <br />
          from job search to job offer
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1 — tailored applications */}
          <div className={CARD} style={crown("#FFB347", "#F9ED96")}>
            <div className={`absolute left-6 right-6 top-[30px] p-4 text-[0.8rem] leading-relaxed text-[#475569] ${WHITE}`}>
              Hi team — I&apos;ve spent 4 years building <span className={hl}>React dashboards</span> for{" "}
              <span className={hl}>20k daily users</span>, and your <span className={hl}>design-system role</span> is exactly
              where I want to grow…
            </div>
            <span className={`absolute left-10 top-[180px] ${PILL}`}>
              <span className="text-base text-[#a855f7]">✦</span> Tailor to this job
            </span>
            <Cursor className="left-[140px] top-[205px]" />
            <h3 className={TITLE}>Tailored applications</h3>
            <p className={BODY}>Cover letter, resume points and screening answers written for each job — never invented.</p>
          </div>

          {/* 2 — every job board */}
          <div className={CARD} style={crown("#E5A1F5", "#F8ACA0")}>
            <svg className="absolute left-1/2 top-6 h-[180px] w-[280px] -translate-x-1/2" viewBox="0 0 280 180" aria-hidden="true">
              {[
                [40, 30],
                [240, 30],
                [20, 110],
                [260, 110],
                [80, 165],
                [200, 165],
              ].map(([x, y], i) => (
                <line key={i} x1="140" y1="90" x2={x} y2={y} stroke="#fff" strokeWidth="2" strokeDasharray="4 5" />
              ))}
              <circle cx="140" cy="90" r="30" fill="#15201a" />
              <path d="M127 92l9 9 17-20" fill="none" stroke="#f3f5b0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              {[
                [40, 30, "#3b82f6", "R"],
                [240, 30, "#16a34a", "G"],
                [20, 110, "#7c3aed", "H"],
                [260, 110, "#0f172a", "L"],
                [80, 165, "#f97316", "A"],
                [200, 165, "#e11d48", "OK"],
              ].map(([x, y, c, l]) => (
                <g key={l as string}>
                  <circle cx={x as number} cy={y as number} r="15" fill="#fff" />
                  <circle cx={x as number} cy={y as number} r="11" fill={c as string} />
                  <text x={x as number} y={(y as number) + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">
                    {l}
                  </text>
                </g>
              ))}
            </svg>
            <h3 className={TITLE}>One search, every board</h3>
            <p className={BODY}>Remote boards plus the career pages of top companies — add LinkedIn and Indeed with a free key.</p>
          </div>

          {/* 3 — tracker */}
          <div className={CARD} style={crown("#F9ED96", "#E5A1F5")}>
            <div
              className="absolute inset-0 [mask-image:radial-gradient(circle_at_center_top,black_0%,transparent_80%)]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />
            <div className="absolute left-1/2 top-[44px] grid w-[190px] -translate-x-1/2 gap-2 drop-shadow-[0_15px_25px_rgba(0,0,0,0.08)]">
              {[
                ["Applied", "#e6e5f6", "#3d3a8c"],
                ["Interviewing", "#fbefd9", "#9a5a06"],
                ["Offer 🎉", "#eaf1d6", "#4a7430"],
              ].map(([l, bg, fg], i) => (
                <div key={l} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#1e293b]" style={{ marginLeft: i * 10 }}>
                  Acme Inc. <span className="rounded-full px-2 py-0.5" style={{ background: bg, color: fg }}>{l}</span>
                </div>
              ))}
            </div>
            <span className={`absolute left-1/2 top-[190px] -translate-x-1/2 font-medium ${PILL}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search your applications
            </span>
            <h3 className={TITLE}>Every application, tracked</h3>
            <p className={BODY}>Drag jobs from Saved to Offer, keep notes, and never lose track of a follow-up.</p>
          </div>

          {/* 4 — autopilot */}
          <div className={CARD} style={crown("#9FD8B8", "#DCEFC2")}>
            <div className={`absolute left-6 right-6 top-[30px] p-4 ${WHITE}`}>
              <div className="flex items-center justify-between text-xs font-semibold text-[#1e293b]">
                <span>Autopilot · every morning</span>
                <span className="rounded-full bg-[#eaf1d6] px-2 py-0.5 text-[#4a7430]">Active</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["120", "found"],
                  ["14", "scored"],
                  ["5", "written"],
                ].map(([n, l]) => (
                  <div key={l} className="rounded-lg bg-[#F4F8F9] py-2">
                    <p className="text-lg font-bold text-[#0f172a]">{n}</p>
                    <p className="text-[10px] text-[#64748b]">{l}</p>
                  </div>
                ))}
              </div>
            </div>
            <h3 className={TITLE}>Autopilot while you sleep</h3>
            <p className={BODY}>Saved searches run daily, score new jobs and write applications for the strongest matches.</p>
          </div>

          {/* 5 — autofill */}
          <div className={CARD} style={crown("#A7C7FF", "#D7E3FF")}>
            <div className={`absolute left-6 right-6 top-[30px] grid gap-2 p-4 ${WHITE}`}>
              {["Full name", "Email", "Why this company?"].map((f, i) => (
                <div key={f} className="rounded-lg border-2 border-[#5f8b3e]/60 px-3 py-1.5 text-left text-[11px] text-[#334155]">
                  <span className="block text-[9px] uppercase tracking-wide text-[#94a3b8]">{f}</span>
                  {["Sara Khan", "sara@email.com", "Your design system work…"][i]}
                </div>
              ))}
            </div>
            <Cursor className="right-10 top-[165px]" />
            <h3 className={TITLE}>One-click autofill</h3>
            <p className={BODY}>The browser extension fills application forms with your answers. You review and submit.</p>
          </div>

          {/* 6 — free AI */}
          <div className={CARD} style={crown("#F8ACA0", "#F9ED96")}>
            <div className="absolute left-1/2 top-[40px] flex -translate-x-1/2 flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-[0_15px_25px_rgba(0,0,0,0.08)]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#15201a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
                  <path d="M8.5 12l2.5 2.5 4.5-5" />
                </svg>
              </div>
              <span className={PILL}>
                <span className="text-base text-[#a855f7]">✦</span> Free AI · your own account
              </span>
            </div>
            <h3 className={TITLE}>Free, private, yours</h3>
            <p className={BODY}>Connect OpenRouter in one click for free models. Nothing is sold, and nothing is sent without you.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
