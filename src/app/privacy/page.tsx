import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, EyeOff, Globe, Share2, Trash2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { IconTile, type Tone } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy" };

const SECTIONS: { icon: typeof Database; tone: Tone; title: string; body: React.ReactNode }[] = [
  {
    icon: Database,
    tone: "primary",
    title: "What we store",
    body: "Your account email, the profile and resume you upload, the jobs you save, the applications the AI writes for you, your autopilot searches, and your AI provider key (encrypted with AES-256-GCM).",
  },
  {
    icon: Share2,
    tone: "violet",
    title: "Where your data goes",
    body: (
      <>
        When you use an AI feature, your profile and the job posting are sent to the AI provider <i>you</i> chose, using <i>your</i>{" "}
        key, under that provider&apos;s terms. Nothing is sent to anyone else. We never sell data and there are no ads or trackers.
      </>
    ),
  },
  {
    icon: Globe,
    tone: "info",
    title: "Job listings",
    body: "Listings come from public job-board APIs and company career pages. Applications are always submitted by you, on the employer's own form.",
  },
  {
    icon: Trash2,
    tone: "danger",
    title: "Deleting your data",
    body: "Settings → Account → Delete account removes your profile, resume, applications, AI key and searches immediately.",
  },
  {
    icon: EyeOff,
    tone: "success",
    title: "Open source",
    body: "All of this can be verified in the code, and you can run your own private copy.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="page-glow min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Logo />
        <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft size={16} aria-hidden="true" /> Home
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <p className="text-sm font-bold uppercase tracking-wider text-primary-text">Privacy</p>
        <h1 className="mt-2 text-[34px] font-extrabold leading-tight tracking-[-0.03em] text-fg sm:text-[42px]">Your data, in plain words</h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">Short version: we keep only what the app needs, never sell it, and you can delete it any time.</p>
        <div className="mt-10 grid gap-4">
          {SECTIONS.map((s) => (
            <section key={s.title} className="flex gap-4 rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6">
              <IconTile tone={s.tone}>
                <s.icon size={18} />
              </IconTile>
              <div>
                <h2 className="text-base font-bold text-fg">{s.title}</h2>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
