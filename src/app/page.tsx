import Link from "next/link";
import { LandingMosaic } from "@/components/landing-mosaic";
import { FeatureCards } from "@/components/feature-cards";
import "./landing.css";
import { GithubIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ButtonLink, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/openapply/openapply";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
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

        <FeatureCards />

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
