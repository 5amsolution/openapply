import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink, IconTile } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="page-glow flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-5 pb-24 text-center">
        <IconTile tone="primary" size="lg">
          <Compass size={22} />
        </IconTile>
        <p className="mt-5 text-sm font-bold uppercase tracking-wider text-primary-text">404 · Page not found</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg">This page wandered off</h1>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
          The link may be old, or the job may have been removed. Let&apos;s get you back on track.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
          <ButtonLink href="/jobs" variant="secondary">
            Search jobs
          </ButtonLink>
        </div>
        <Link href="/" className="mt-6 text-sm font-semibold text-muted hover:text-fg">
          or visit the home page
        </Link>
      </main>
    </div>
  );
}
