import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  EyeOff,
  FileText,
  Gift,
  Hand,
  Kanban,
  Lock,
  Puzzle,
  Search,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Logo, LogoMark } from "@/components/logo";
import { HeroPreview } from "@/components/landing/hero-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink, IconTile, SOFT, ScoreRing, buttonClass, cn, type Tone } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/openapply/openapply";

const SOURCES = ["Remotive", "Himalayas", "Jobicy", "Remote OK", "Arbeitnow", "Greenhouse", "Lever", "Ashby", "LinkedIn · Indeed · Glassdoor (free key)"];

const STEPS: { icon: typeof Upload; tone: Tone; title: string; body: string }[] = [
  {
    icon: Upload,
    tone: "pink",
    title: "Upload your resume",
    body: "The AI reads it and builds your profile in about thirty seconds. Check it over — it never adds experience you don't have.",
  },
  {
    icon: Search,
    tone: "primary",
    title: "Search once",
    body: "One search covers remote job boards and hundreds of company career pages, and every result shows how well you fit.",
  },
  {
    icon: Hand,
    tone: "success",
    title: "Apply in a minute",
    body: "Get a tailored cover letter and answers, then apply right inside OpenApply with everything ready to copy across.",
  },
];

const FAQ = [
  {
    q: "Is OpenApply really free?",
    a: "Yes. The hosted app costs nothing, and the AI runs on your own OpenRouter account where free models cost $0 — about 50 AI actions a day, or 1,000 a day after a one-time $10 credit purchase. No subscription, no ads.",
  },
  {
    q: "Does it apply to jobs for me automatically?",
    a: "No, on purpose. Job sites prohibit bots and most forms need a human check. OpenApply does everything up to the submit button — you review and send, which usually takes about a minute.",
  },
  {
    q: "Will the AI make things up about me?",
    a: "The AI writes only from your own profile and resume, and it's instructed never to invent experience. You can edit every word before you apply.",
  },
  {
    q: "Where do the jobs come from?",
    a: "Public job boards (Remotive, Himalayas, Jobicy, Remote OK and Arbeitnow) plus company career pages on Greenhouse, Lever and Ashby. Add a free JSearch key to include LinkedIn, Indeed and Glassdoor.",
  },
  {
    q: "Is my data safe?",
    a: "Your AI key is encrypted with AES-256-GCM, nothing is sold, and there are no trackers. You can delete your account and everything in it from Settings at any time.",
  },
  {
    q: "Can I run my own copy?",
    a: "Yes — OpenApply is MIT-licensed. You can self-host it on Railway and Supabase in about ten minutes.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const startHref = user ? "/dashboard" : "/login?mode=signup";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-semibold text-muted md:flex">
            {[
              ["#how", "How it works"],
              ["#features", "Features"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 transition-colors hover:bg-surface-2 hover:text-fg">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <a href={REPO_URL} className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>
              <GithubIcon size={16} /> Source
            </a>
            {user ? (
              <ButtonLink href="/dashboard" size="sm">
                Open app <ArrowRight size={15} aria-hidden="true" />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm" className="text-fg">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/login?mode=signup" size="sm">
                  <span>
                    Get started<span className="hidden sm:inline"> free</span>
                  </span>
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow-a),transparent)]" />
            <div className="absolute -right-40 top-20 h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,var(--glow-b),transparent)]" />
            <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:44px_44px] opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
          </div>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28 lg:pt-20">
            <div className="animate-[oa-rise_600ms_var(--ease-out)]">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3.5 text-[13px] font-semibold text-fg shadow-xs">
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-primary-soft px-2 text-primary-soft-fg">
                  <Gift size={13} aria-hidden="true" /> Free
                </span>
                Open source · No credit card
              </p>
              <h1 className="mt-6 text-[44px] font-extrabold leading-[1.04] tracking-[-0.03em] text-fg sm:text-[58px] lg:text-[64px]">
                Find the right job.
                <br />
                Apply in <span className="font-serif text-[1.08em] font-normal italic tracking-[-0.01em] text-primary-text">minutes.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                OpenApply searches dozens of job boards at once, tells you honestly how well you fit each role, and writes a tailored
                application for every one — with AI you control, at no cost.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={startHref} size="lg" className="h-13 px-7 text-base">
                  {user ? "Open your dashboard" : "Get started — it's free"} <ArrowRight size={18} aria-hidden="true" />
                </ButtonLink>
                <a href="#how" className={buttonClass("secondary", "lg", "h-13 px-7 text-base")}>
                  See how it works
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-semibold text-fg">
                {["Free forever", "Never submits without you", "Your data stays yours"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft text-success-soft-fg" aria-hidden="true">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* Sources */}
        <section aria-labelledby="sources-title" className="border-y border-border bg-surface py-8">
          <p id="sources-title" className="text-center text-sm font-semibold text-muted">
            One search covers
          </p>
          <div className="relative mt-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
            <ul className="flex w-max animate-[oa-marquee_45s_linear_infinite] gap-3 hover:[animation-play-state:paused]">
              {[...SOURCES, ...SOURCES].map((s, i) => (
                <li
                  key={i}
                  aria-hidden={i >= SOURCES.length || undefined}
                  className="shrink-0 rounded-full border border-border bg-bg px-4 py-2 text-sm font-semibold text-fg"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <SectionIntro
              id="how-title"
              eyebrow="How it works"
              title="From resume to ready-to-send in three steps"
              body="No setup marathon. Most people send their first tailored application within ten minutes."
            />
            <ol className="mt-14 grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-3xl border border-border bg-surface p-7 shadow-xs">
                  <div className="flex items-center justify-between">
                    <IconTile tone={s.tone} size="lg">
                      <s.icon size={22} />
                    </IconTile>
                    <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold tracking-tight text-fg">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-title" className="scroll-mt-20 border-y border-border bg-surface py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <SectionIntro
              id="features-title"
              eyebrow="Everything in one place"
              title="The calm, organised way to job hunt"
              body="Stop juggling tabs, spreadsheets and blank cover letters. OpenApply keeps the whole search in one friendly place."
            />
            <div className="mt-14 grid gap-5 md:grid-cols-6">
              <Feature className="md:col-span-4" icon={Search} tone="primary" title="One search, every board" body="Remote job boards plus the career pages of hundreds of companies — deduplicated and ranked for you.">
                <div className="mt-6 flex flex-wrap gap-2">
                  {SOURCES.slice(0, 8).map((s) => (
                    <span key={s} className="rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-fg">
                      {s}
                    </span>
                  ))}
                  <span className="rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary-soft-fg">+ LinkedIn, Indeed & Glassdoor</span>
                </div>
              </Feature>
              <Feature className="md:col-span-2" icon={Target} tone="success" title="Honest fit scores" body="See why you fit — and what's worth addressing — before you spend time applying.">
                <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                  <ScoreRing score={87} size={56} />
                  <ul className="grid gap-1.5 text-[13px] text-fg">
                    <li className="flex items-center gap-1.5">
                      <Check size={14} strokeWidth={3} className="text-success" aria-hidden="true" /> React & TypeScript
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CircleDot size={14} className="text-warn" aria-hidden="true" /> Add a team lead story
                    </li>
                  </ul>
                </div>
              </Feature>
              <Feature className="md:col-span-2" icon={FileText} tone="pink" title="Tailored, never invented" body="A cover letter, resume summary and screening answers written for each job — from your real experience.">
                <p className="mt-6 rounded-2xl border border-border bg-surface p-4 text-[13px] leading-relaxed text-fg">
                  “…four years building <mark className="rounded bg-primary-soft px-1 text-primary-soft-fg">React dashboards</mark> for{" "}
                  <mark className="rounded bg-primary-soft px-1 text-primary-soft-fg">20k daily users</mark> — exactly the scale your team is growing
                  into.”
                </p>
              </Feature>
              <Feature className="md:col-span-4" icon={Bot} tone="violet" title="Autopilot finds jobs while you sleep" body="Save a search and it runs every day. New matches are scored, and the best ones get an application written — waiting for you in the morning.">
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    ["42", "new jobs found"],
                    ["12", "scored by AI"],
                    ["3", "ready to send"],
                  ].map(([n, l]) => (
                    <div key={l} className="rounded-2xl border border-border bg-surface p-4 text-center">
                      <p className="text-3xl font-extrabold tracking-tight text-fg">{n}</p>
                      <p className="text-[13px] font-medium text-muted">{l}</p>
                    </div>
                  ))}
                </div>
              </Feature>
              <Feature className="md:col-span-3" icon={Sparkles} tone="info" title="Apply without tab-juggling" body="The employer's form opens right inside OpenApply, with your letter, answers and details one click from being copied.">
                <div className="mt-6 grid grid-cols-[1.4fr_1fr] gap-2 rounded-2xl border border-border bg-surface p-3">
                  <div className="grid content-start gap-2 rounded-xl bg-surface-2 p-3">
                    {["Full name", "Email", "Why this role?"].map((f) => (
                      <div key={f}>
                        <p className="text-[11px] font-semibold text-muted">{f}</p>
                        <div className="mt-1 h-6 rounded-md border border-border bg-surface" />
                      </div>
                    ))}
                  </div>
                  <div className="grid content-start gap-2">
                    {["Cover letter", "Answers", "Resume"].map((f) => (
                      <div key={f} className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-[12px] font-semibold text-fg">
                        {f} <span className="rounded bg-primary-soft px-1.5 text-[11px] text-primary-soft-fg">Copy</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Feature>
              <Feature className="md:col-span-3" icon={Kanban} tone="warn" title="Every application, tracked" body="Drag cards from saved to applied to interviewing. Celebrate every step forward.">
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["Applied", "info", ["Northwind", "Brightpath"]],
                      ["Interviewing", "warn", ["Lumen Labs"]],
                      ["Offer", "success", ["Acme Co."]],
                    ] as [string, Tone, string[]][]
                  ).map(([col, tone, cards]) => (
                    <div key={col} className="rounded-xl bg-surface-2 p-2">
                      <p className="mb-2 px-1 text-[12px] font-bold text-fg">{col}</p>
                      <div className="grid gap-1.5">
                        {cards.map((c) => (
                          <div key={c} className="rounded-lg border border-border bg-surface p-2">
                            <p className="truncate text-[12px] font-semibold text-fg">{c}</p>
                            <span className={cn("mt-1 inline-block rounded-full px-1.5 text-[11px] font-semibold", SOFT[tone])}>{col}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Feature>
              <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-border bg-bg p-7 sm:flex-row sm:items-center md:col-span-6">
                <div className="flex items-start gap-4">
                  <IconTile tone="violet" size="lg">
                    <Puzzle size={22} />
                  </IconTile>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-fg">Autofill extension for everything else</h3>
                    <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted">
                      On Workday, SmartRecruiters and other sites, the browser extension fills your details and tailored answers in one
                      click — and double-checks every field.
                    </p>
                  </div>
                </div>
                <ButtonLink href={startHref} variant="secondary">
                  Try it free
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* Free & private */}
        <section aria-labelledby="free-title" className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="relative overflow-hidden rounded-[28px] p-8 text-white shadow-lg sm:p-12" style={{ background: "var(--brand-deep)" }}>
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#ec4899] opacity-20 blur-3xl" />
                <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-[#8b5cf6] opacity-30 blur-3xl" />
              </div>
              <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-[#c7d2fe]">Free, really</p>
                  <h2 id="free-title" className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-[40px]">
                    Free because you bring the AI
                  </h2>
                  <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-[#e0e7ff]">
                    OpenApply doesn&apos;t charge you or sell your data. Connect your own OpenRouter account in one click and use free AI
                    models — no card, no keys to copy, and you can disconnect whenever you like.
                  </p>
                  <Link
                    href={startHref}
                    className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-bold text-[#312e81] shadow-md transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {user ? "Open your dashboard" : "Start for free"} <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {[
                    { icon: Sparkles, title: "Free AI models", body: "About 50 AI actions a day at no cost." },
                    { icon: Lock, title: "Encrypted & private", body: "Keys and resumes are encrypted at rest." },
                    { icon: EyeOff, title: "No ads, no trackers", body: "Nothing about you is ever sold." },
                    { icon: Clock3, title: "Yours to keep", body: "MIT-licensed. Self-host in ten minutes." },
                  ].map((f) => (
                    <li key={f.title} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
                      <f.icon size={20} aria-hidden="true" />
                      <p className="mt-3 font-bold">{f.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#e0e7ff]">{f.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 pb-20 sm:pb-28">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_1.5fr]">
            <SectionIntro id="faq-title" eyebrow="Questions" title="Good to know" body="Anything else? Open an issue on GitHub — a real person reads every one." align="left" />
            <div className="grid content-start gap-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-border bg-surface shadow-xs open:shadow-sm">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-base font-bold text-fg">
                    {f.q}
                    <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="cta-title" className="border-t border-border bg-surface py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-5 text-center">
            <LogoMark size={52} className="mx-auto" />
            <h2 id="cta-title" className="mt-7 text-[34px] font-extrabold leading-[1.1] tracking-[-0.035em] text-fg sm:text-[46px]">
              Your next job is out there.
              <br />
              <span className="font-serif text-[1.08em] font-normal italic tracking-normal text-primary-text">Let&apos;s go find it.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted">Free to use, with free AI. Setting up takes about two minutes.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href={startHref} size="lg" className="h-13 px-7 text-base">
                {user ? "Open your dashboard" : "Get started — it's free"} <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
              <a href={REPO_URL} className={buttonClass("secondary", "lg", "h-13 px-7 text-base")}>
                <GithubIcon size={18} /> Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-2 max-w-sm text-sm text-muted">Free, open-source job search with AI you control. Job listings belong to the boards they link to.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Link href="/privacy" className="rounded-lg px-3 py-2 text-muted hover:bg-surface-2 hover:text-fg">
              Privacy
            </Link>
            <a href={REPO_URL} className="rounded-lg px-3 py-2 text-muted hover:bg-surface-2 hover:text-fg">
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionIntro({
  id,
  eyebrow,
  title,
  body,
  align = "center",
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-md"}>
      <p className="text-sm font-bold uppercase tracking-wider text-primary-text">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.03em] text-fg sm:text-[40px]">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Feature({
  icon: Icon,
  tone,
  title,
  body,
  className,
  children,
}: {
  icon: typeof Search;
  tone: Tone;
  title: string;
  body: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("lift flex flex-col rounded-3xl border border-border bg-bg p-7", className)}>
      <IconTile tone={tone}>
        <Icon size={20} />
      </IconTile>
      <h3 className="mt-5 text-lg font-bold tracking-tight text-fg">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</p>
      <div className="mt-auto" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
