import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Bot, FileText, KeyRound, Puzzle, Search, ShieldCheck } from "lucide-react";
import { LandingMosaic } from "@/components/landing-mosaic";
import "./landing.css";
import { GithubIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ButtonLink, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/openapply/openapply";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className={`${jakarta.variable} flex min-h-screen flex-col`}>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <a href={REPO_URL} className="hidden items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-fg sm:flex">
            <GithubIcon size={16} /> Source
          </a>
          {user ? (
            <ButtonLink href="/dashboard">Open app</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">
                Sign in
              </ButtonLink>
              <ButtonLink href="/login?mode=signup">Get started free</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <LandingMosaic signedIn={!!user} />

        <section id="how" className="mx-auto grid max-w-6xl scroll-mt-6 gap-4 px-5 pb-20 pt-10 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Search,
              title: "One search, every board",
              body: "Remotive, Himalayas, Remote OK, Jobicy, Arbeitnow, and the Greenhouse, Lever and Ashby career pages of top companies. Add Adzuna, USAJOBS or JSearch with a free key.",
            },
            {
              icon: FileText,
              title: "Your resume, understood",
              body: "Upload a PDF or DOCX. The AI turns it into a structured profile you can edit, and never invents experience you don't have.",
            },
            {
              icon: Bot,
              title: "Autopilot",
              body: "Save a search and OpenApply checks it every day, scores new jobs, and has a full application ready for the good ones.",
            },
            {
              icon: Puzzle,
              title: "One-click autofill",
              body: "The browser extension fills Greenhouse, Lever, Ashby, Workday and most other application forms with your tailored answers.",
            },
            {
              icon: KeyRound,
              title: "Free AI, your control",
              body: "Connect your own OpenRouter account in one click and use free models — no key to copy, no card. Want Claude or GPT? Switch models and set your own spending limit.",
            },
            {
              icon: ShieldCheck,
              title: "You stay in control",
              body: "Nothing is ever submitted without you. Job boards ban automated submissions, and a human check keeps your applications good.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6">
              <Icon size={20} className="text-accent" />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </Card>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <Card className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Free for everyone, and the code is yours too.</h2>
              <p className="mt-1 text-sm text-muted">
                Use the hosted version at no cost, or self-host it on Railway + Supabase in about ten minutes.
              </p>
            </div>
            <div className="flex gap-2">
              <ButtonLink href={REPO_URL} variant="secondary">
                <GithubIcon size={16} /> View on GitHub
              </ButtonLink>
              <ButtonLink href={user ? "/dashboard" : "/login?mode=signup"}>Get started</ButtonLink>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
          <span>OpenApply — MIT licensed. Job data belongs to the boards it links to.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <a href={REPO_URL} className="hover:text-fg">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
