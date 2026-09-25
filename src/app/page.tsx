import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  EyeOff,
  FileText,
  Hand,
  Kanban,
  Lock,
  MessageSquareText,
  Puzzle,
  Search,
  Send,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Logo, LogoMark } from "@/components/logo";
import { HeroPreview } from "@/components/landing/hero-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink, IconTile, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/MuhammadAbdullah80/openapply";

const SOURCES = ["Remotive", "Himalayas", "Jobicy", "Remote OK", "Arbeitnow", "Greenhouse", "Lever", "Ashby", "LinkedIn", "Indeed", "Glassdoor"];

const STATS = [
  ["11", "job sources"],
  ["1 min", "per application"],
  ["$0", "to use, forever"],
];

const FEATURES = [
  { icon: Search, title: "Every board, one search", body: "Remote boards and hundreds of company career pages." },
  { icon: Target, title: "Honest fit score", body: "See why you match before you spend time applying." },
  { icon: FileText, title: "Tailored cover letters", body: "Written from your real experience. Never invented." },
  { icon: MessageSquareText, title: "Screening answers", body: "The usual form questions, answered for you." },
  { icon: Send, title: "Apply inside the app", body: "The employer's form next to your ready answers." },
  { icon: Bot, title: "Autopilot", body: "Finds new matches daily and drafts the best ones." },
  { icon: Kanban, title: "Tracker board", body: "Saved, applied, interviewing and offers in one view." },
  { icon: Puzzle, title: "Autofill extension", body: "Fills Workday, Lever and other forms in one click." },
];

const STEPS = [
  { icon: Search, title: "Find", body: "Search once. Every result gets a fit score." },
  { icon: Wand2, title: "Tailor", body: "The AI writes your letter and answers." },
  { icon: Send, title: "Apply", body: "Review, submit, and track it. About a minute." },
];

const PROMISES = [
  { icon: Sparkles, title: "Free AI", body: "Runs on your own free OpenRouter account." },
  { icon: Hand, title: "You submit", body: "Nothing is ever sent without you." },
  { icon: Lock, title: "Private", body: "Keys and resumes are encrypted." },
  { icon: EyeOff, title: "No ads, no tracking", body: "Open source (MIT). Nothing is sold." },
];

const FAQ = [
  { q: "Is it really free?", a: "Yes. The app is free, and the AI runs on your own OpenRouter account, where free models cost nothing." },
  { q: "Does it apply for me?", a: "No, on purpose. It prepares everything up to the submit button. You review and send, usually in a minute." },
  { q: "Will the AI make things up?", a: "No. It only uses your profile and resume, and you can edit every word before you apply." },
  { q: "Where do the jobs come from?", a: "Public job boards and company career pages. Add a free key for LinkedIn, Indeed and Glassdoor." },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const startHref = user ? "/dashboard" : "/login?mode=signup";
  const startLabel = user ? "Open your dashboard" : "Get started free";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header: always dark, like the logo */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg text-fg scheme-dark">
        <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-4 px-5 lg:px-10">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-semibold text-muted md:flex">
            {[
              ["#features", "Features"],
              ["#how", "How it works"],
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
            {!user && (
              <ButtonLink href="/login" variant="ghost" size="sm" className="text-fg">
                Sign in
              </ButtonLink>
            )}
            <ButtonLink href={startHref} size="sm">
              {user ? "Open app" : "Get started"} <ArrowRight size={15} aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero: the 5AM sunrise */}
        <section className="sunrise relative isolate overflow-hidden border-b border-border">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_30%_0%,black,transparent)]"
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-[1360px] items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:px-10 lg:pb-20 lg:pt-16">
            <div className="animate-[oa-rise_600ms_var(--ease-out)]">
              <div className="flex items-center gap-3">
                <LogoMark size={56} tile={false} className="drop-shadow-[0_0_24px_rgb(255_122_0/0.5)]" />
                <span className="rounded-full border border-border bg-surface/80 px-3 py-1 text-[13px] font-semibold text-fg">Free and open source</span>
              </div>
              <h1 className="mt-6 text-[48px] font-extrabold leading-[1] tracking-[-0.04em] text-fg sm:text-[64px] xl:text-[76px]">
                Find. Tailor.
                <br />
                <span className="text-brand">Apply.</span>
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                Search every job board at once, see how well you fit, and send tailored applications in minutes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href={startHref} size="lg" className="px-7">
                  {startLabel} <ArrowRight size={18} aria-hidden="true" />
                </ButtonLink>
                <a href="#how" className={buttonClass("secondary", "lg", "px-7")}>
                  How it works
                </a>
              </div>
              <dl className="mt-9 grid max-w-md grid-cols-3 gap-3">
                {STATS.map(([n, label]) => (
                  <div key={label} className="rounded-xl border border-border bg-surface/70 px-3 py-3">
                    <dt className="sr-only">{label}</dt>
                    <dd>
                      <span className="block text-2xl font-extrabold tracking-tight text-fg">{n}</span>
                      <span className="text-[13px] text-muted">{label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="pb-10">
              <HeroPreview />
            </div>
          </div>
          <div className="border-t border-border">
            <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 lg:px-10">
              <span className="text-[13px] font-semibold uppercase tracking-wider text-muted">Searches</span>
              {SOURCES.map((s) => (
                <span key={s} className="text-sm font-semibold text-fg">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-title" className="scroll-mt-16 py-16 sm:py-20">
          <div className="mx-auto max-w-[1360px] px-5 lg:px-10">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 id="features-title" className="text-3xl font-extrabold tracking-[-0.03em] text-fg sm:text-4xl">
                Everything for the job hunt
              </h2>
              <p className="text-base text-muted">One place, from search to offer.</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="lift group rounded-2xl border border-border bg-surface p-5 shadow-xs">
                  <IconTile tone="primary" className="transition-transform duration-200 group-hover:scale-110">
                    <f.icon size={19} />
                  </IconTile>
                  <h3 className="mt-4 text-base font-bold text-fg">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-16 border-y border-border bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-[1360px] px-5 lg:px-10">
            <h2 id="how-title" className="mb-8 text-3xl font-extrabold tracking-[-0.03em] text-fg sm:text-4xl">
              How it works
            </h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="lift group relative flex items-center gap-4 rounded-2xl border border-border bg-bg p-5">
                  <span className="bg-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-primary-fg" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-lg font-extrabold text-fg">
                      <s.icon size={18} aria-hidden="true" className="text-primary-text" /> {s.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted">{s.body}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight
                      size={22}
                      aria-hidden="true"
                      className="absolute -right-[19px] top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-surface text-primary-text md:block"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Promises: always dark, like the logo */}
        <section aria-labelledby="free-title" className="sunrise border-b border-border py-14">
          <div className="mx-auto grid max-w-[1360px] gap-8 px-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:items-center lg:px-10">
            <div>
              <h2 id="free-title" className="text-3xl font-extrabold tracking-[-0.03em] text-fg sm:text-4xl">
                Free, private, yours.
              </h2>
              <ButtonLink href={startHref} className="mt-5">
                {startLabel} <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {PROMISES.map((p) => (
                <li key={p.title} className="rounded-2xl border border-border bg-surface/70 p-4">
                  <p className="flex items-center gap-2 font-bold text-fg">
                    <p.icon size={17} aria-hidden="true" className="text-primary-text" /> {p.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 py-16 sm:py-20">
          <div className="mx-auto max-w-[1360px] px-5 lg:px-10">
            <h2 id="faq-title" className="mb-8 text-3xl font-extrabold tracking-[-0.03em] text-fg sm:text-4xl">
              Questions
            </h2>
            <dl className="grid gap-4 md:grid-cols-2">
              {FAQ.map((f) => (
                <div key={f.q} className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
                  <dt className="flex items-center gap-2 font-bold text-fg">
                    <Check size={17} aria-hidden="true" className="shrink-0 text-primary-text" /> {f.q}
                  </dt>
                  <dd className="mt-1.5 pl-[25px] text-sm leading-relaxed text-muted">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="cta-title" className="mx-auto w-full max-w-[1360px] px-5 pb-16 lg:px-10">
          <div className="sunrise flex flex-col items-center gap-5 rounded-3xl border border-border px-6 py-12 text-center">
            <LogoMark size={64} tile={false} className="drop-shadow-[0_0_24px_rgb(255_122_0/0.45)]" />
            <h2 id="cta-title" className="text-3xl font-extrabold tracking-[-0.03em] text-fg sm:text-4xl">
              Your next job is out there.
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href={startHref} size="lg" className="px-7">
                {startLabel} <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
              <a href={REPO_URL} className={buttonClass("secondary", "lg", "px-7")}>
                <GithubIcon size={18} /> Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer: always dark, like the logo */}
      <footer className="border-t border-border bg-bg text-fg scheme-dark">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-5 py-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Logo />
            <span className="text-sm font-semibold text-primary-text">Find. Tailor. Apply.</span>
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
