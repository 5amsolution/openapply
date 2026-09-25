import Link from "next/link";
import type { CSSProperties } from "react";

// Landing hero, adapted from the MotionSites "Task Engine" design:
// five pastel cards telling the OpenApply story at a glance.

const anim = (duration: number, delay: number): CSSProperties => ({
  animationDuration: `${duration}s`,
  animationDelay: `${delay}s`,
});

const SOURCES: [string, string, string][] = [
  ["Remotive", "R", "#3b82f6"],
  ["Himalayas", "H", "#7c3aed"],
  ["Greenhouse", "G", "#16a34a"],
  ["Lever", "L", "#0f172a"],
  ["Ashby", "A", "#f97316"],
];

const WEEK: [string, number, number][] = [
  ["MON", 1, 43],
  ["TUE", 3, 81],
  ["WED", 6, 132],
  ["THU", 9, 166],
  ["FRI", 14, 203],
  ["SAT", 18, 235],
  ["SUN", 23, 265],
];

function Mono({ letter, color }: { letter: string; color: string }) {
  return (
    <span className="lm-mono" style={{ background: color }} aria-hidden="true">
      {letter}
    </span>
  );
}

export function LandingMosaic({ signedIn }: { signedIn: boolean }) {
  const start = signedIn ? "/jobs" : "/login?mode=signup";

  return (
    <section className="lm" aria-label="What OpenApply does">
      <div className="lm-stage">
        {/* 1 — notification */}
        <div className="lm-card lm-notif a a-panel" style={anim(0.66, 0.1)} aria-label="Autopilot notification">
          <div className="lm-toast-wrap a a-detail" style={anim(0.62, 0.38)}>
            <div className="lm-toast-ledge" />
            <div className="lm-toast">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="12" fill="#0d0d0d" />
                <path d="M12 5.2c.5 3.2 1.6 4.3 4.8 4.8-3.2.5-4.3 1.6-4.8 4.8-.5-3.2-1.6-4.3-4.8-4.8 3.2-.5 4.3-1.6 4.8-4.8Z" fill="#fff" />
                <path d="M16.6 13.4c.2 1.3.7 1.8 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.2 1.8-.7 2-2Z" fill="#fff" />
              </svg>
              <div className="lm-toast-body">
                <p className="lm-toast-title">3 applications ready!</p>
                <p className="lm-toast-sub">Written overnight by Autopilot</p>
              </div>
              <span className="lm-toast-time">7:02 AM</span>
            </div>
          </div>
        </div>

        {/* 2 — sources */}
        <div className="lm-card lm-connect a a-panel" style={anim(0.74, 0.2)} aria-label="Job sources">
          <h2 className="lm-h-connect a a-type" style={anim(0.64, 0.54)}>
            Every job board.
            <br />
            One search.
          </h2>
          <p className="lm-sub-connect a a-rise" style={anim(0.48, 0.73)}>
            Boards and top company career pages
          </p>
          <div className="lm-chips">
            <div className="lm-chip-row r1 a a-rise" style={anim(0.62, 0.86)}>
              <span className="lm-chip">
                {SOURCES[0][0]} <Mono letter={SOURCES[0][1]} color={SOURCES[0][2]} />
              </span>
            </div>
            <div className="lm-chip-row r2 a a-rise" style={anim(0.62, 0.91)}>
              <span className="lm-chip">
                {SOURCES[1][0]} <Mono letter={SOURCES[1][1]} color={SOURCES[1][2]} />
              </span>
              <span className="lm-chip">
                {SOURCES[3][0]} <Mono letter={SOURCES[3][1]} color={SOURCES[3][2]} />
              </span>
            </div>
            <div className="lm-chip-row r3 a a-rise" style={anim(0.62, 0.96)}>
              <span className="lm-chip">
                {SOURCES[2][0]} <Mono letter={SOURCES[2][1]} color={SOURCES[2][2]} />
              </span>
              <span className="lm-chip">
                {SOURCES[4][0]} <Mono letter={SOURCES[4][1]} color={SOURCES[4][2]} />
              </span>
            </div>
          </div>
          <span className="lm-chip lm-chip-float a a-detail" style={anim(0.58, 1.02)}>
            Remote OK <Mono letter="OK" color="#e11d48" />
          </span>
        </div>

        {/* 3 — hero */}
        <div className="lm-card lm-automate a a-panel" style={anim(0.82, 0.04)}>
          <div className="lm-copy">
            <h1 className="lm-h-hero a a-type" style={anim(0.78, 0.2)}>
              <span className="g">Automate</span> your job hunt.
              <br />
              Focus on the interviews.
            </h1>
            <p className="lm-sub-hero a a-rise" style={anim(0.54, 0.48)}>
              AI finds jobs, scores your fit and writes every application. Free and open source.
            </p>
            <div className="lm-cta-row a a-rise" style={anim(0.54, 0.6)}>
              <Link href={start} className="lm-cta primary">
                {signedIn ? "Find jobs" : "Start free"} →
              </Link>
              <a href="#how" className="lm-cta ghost">
                How it works
              </a>
            </div>
          </div>

          <div className="lm-illo" aria-hidden="true">
            <div className="lm-win lm-win-back a a-ui" style={anim(0.84, 0.42)}>
              <div className="lm-win-bar">
                <i />
                <i />
                <i />
              </div>
              <div className="lm-win-body">
                <div className="lm-strip" />
              </div>
            </div>
            <div className="lm-win lm-win-front a a-ui" style={anim(0.94, 0.5)}>
              <div className="lm-win-bar">
                <i />
                <i />
                <i />
              </div>
              <div className="lm-win-body">
                <div className="lm-strip" />
                <div className="lm-doc">
                  <b className="h" />
                  <b />
                  <b style={{ width: "88%" }} />
                  <b style={{ width: "72%" }} />
                </div>
              </div>
            </div>
            <div className="lm-pill-ai a a-detail" style={anim(0.6, 0.72)}>
              <div className="lm-skel">
                <i />
                <i />
              </div>
              <svg viewBox="0 0 24 24">
                <path d="M7 2.6c.4 2.4 1.2 3.2 3.6 3.6-2.4.4-3.2 1.2-3.6 3.6-.4-2.4-1.2-3.2-3.6-3.6 2.4-.4 3.2-1.2 3.6-3.6Z" fill="#eff4e6" stroke="#4f7433" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M15 8.5c.7 4.2 2.1 5.6 6.3 6.3-4.2.7-5.6 2.1-6.3 6.3-.7-4.2-2.1-5.6-6.3-6.3 4.2-.7 5.6-2.1 6.3-6.3Z" fill="#eff4e6" stroke="#4f7433" strokeWidth="2.25" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="lm-pill-wf a a-detail" style={anim(0.58, 0.78)}>
              <span className="lm-tick">
                <svg viewBox="0 0 12 12">
                  <path d="M2.5 6.3 5 8.6l4.6-5" fill="none" stroke="#161616" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Cover letter written · 92% fit
            </div>
            <svg className="lm-cursor a a-detail" style={anim(0.54, 0.96)} viewBox="0 0 24 28">
              <path d="M3 2.5v19.2l5.1-4.6 3.2 7.4 3.4-1.5-3.2-7.2 6.9-.3L3 2.5Z" fill="#fff" stroke="#2b2b2b" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* 4 — insights */}
        <div className="lm-card lm-insights a a-panel" style={anim(0.74, 0.14)} aria-label="Applications this week">
          <span className="lm-tag a a-rise" style={anim(0.46, 0.44)}>
            Your week
          </span>
          <h2 className="lm-h-insights a a-type" style={anim(0.62, 0.56)}>
            23 applications
          </h2>
          <p className="lm-sub-insights a a-rise" style={anim(0.44, 0.75)}>
            written for you, each one tailored
          </p>
          <div
            className="lm-chart a a-chart"
            style={anim(0.86, 0.72)}
            role="img"
            aria-label="Applications written per day, Monday to Sunday: 1, 3, 6, 9, 14, 18, 23"
          >
            {WEEK.map(([day, n, h], i) => (
              <div key={day} className="lm-col">
                <div className={`lm-bar${i === WEEK.length - 1 ? " top" : ""}`} style={{ height: `calc(${h} * var(--u))` }}>
                  {n}
                </div>
                <span className="lm-day">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5 — search (a real search box) */}
        <div className="lm-card lm-search a a-panel" style={anim(0.68, 0.28)}>
          <h2 className="lm-h-search a a-type" style={anim(0.56, 0.72)}>
            Find your next
            <br />
            job instantly
          </h2>
          <form action="/jobs" className="lm-bar-search a a-search" style={anim(0.7, 0.88)} role="search">
            <span className="lm-mag" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="10.5" cy="10.5" r="7.1" fill="none" stroke="#121212" strokeWidth="2.2" />
                <path d="m16 16 5 5" stroke="#121212" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            <input name="q" required placeholder="Search jobs, e.g. frontend developer" aria-label="Search jobs" />
            <button type="submit" className="lm-go">
              Search
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
