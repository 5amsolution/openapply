import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Terms of Service" };

const UPDATED = "30 September 2026";
const EMAIL = "abdullah@5amsolution.org";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "What the service does",
    body: (
      <>
        <p>
          5AM Apply searches public job listings, scores how well each one fits your profile, and drafts cover letters and answers to
          application questions. Autopilot repeats your saved searches every day and prepares drafts for your review. The browser
          extension fills application forms from your profile on pages you open.
        </p>
        <p>
          5AM Apply never submits an application for you. You review every application and press submit yourself, on the
          employer&apos;s own site.
        </p>
      </>
    ),
  },
  {
    title: "Free and open source",
    body: (
      <>
        <p>The service is free to use. There is no paid plan and no card is needed.</p>
        <p>
          The source code is published under the{" "}
          <a href="https://www.gnu.org/licenses/agpl-3.0.html" className="font-semibold text-fg underline underline-offset-2">
            GNU AGPL v3
          </a>
          . That license covers the code; these terms cover the hosted service at apply.5amsolution.com. The 5AM Apply name and logo
          are not covered by the code license.
        </p>
      </>
    ),
  },
  {
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least 16 years old and give accurate details.</li>
        <li>Keep your password safe. You are responsible for what happens in your account.</li>
        <li>Your profile must describe you. Don&apos;t create an account for someone else without their permission.</li>
      </ul>
    ),
  },
  {
    title: "Your AI provider",
    body: (
      <p>
        AI features run on the provider you connect, such as OpenRouter, Anthropic, OpenAI or Google, using your own account or key.
        That provider handles your requests under its own terms and bills you directly for any paid usage. You can set a monthly limit
        in Settings, but charges from your provider are between you and them.
      </p>
    ),
  },
  {
    title: "Job listings",
    body: (
      <>
        <p>
          Listings come from third-party job boards, company career pages and search services. We don&apos;t write, check or endorse
          them, and we are not the employer. Details such as salary, location and whether a role is still open can be wrong or out
          of date, so confirm them on the employer&apos;s site.
        </p>
        <p>A genuine employer will never ask you to pay to apply. Be careful with any listing that does.</p>
      </>
    ),
  },
  {
    title: "AI output",
    body: (
      <p>
        Fit scores, cover letters and answers are written by AI and can be wrong. The AI is told to use only what is in your profile,
        but it can still make mistakes. Read everything before you send it. You are responsible for what you submit, and it must be
        true. A fit score is a guide, not a prediction of whether you will be hired.
      </p>
    ),
  },
  {
    title: "Acceptable use",
    body: (
      <ul>
        <li>Don&apos;t use the service to send false or misleading applications, or to spam employers.</li>
        <li>Don&apos;t try to access other people&apos;s accounts or data, or to break, overload or scrape the service.</li>
        <li>Follow the rules of the job sites and employer sites you use, including when the extension fills a form.</li>
      </ul>
    ),
  },
  {
    title: "Your content",
    body: (
      <p>
        Your profile, resume and applications belong to you. You let us store and process them only to run the service for you. How we
        handle them is set out in our{" "}
        <Link href="/privacy" className="font-semibold text-fg underline underline-offset-2">
          privacy notes
        </Link>
        .
      </p>
    ),
  },
  {
    title: "Availability and changes",
    body: (
      <p>
        We work to keep the service running but can&apos;t promise it will never be interrupted. Job sources can change or stop
        working without notice. We may change, improve or remove features. If we change these terms in a way that matters, we will tell
        you by email first.
      </p>
    ),
  },
  {
    title: "Ending your account",
    body: (
      <p>
        You can delete your account at any time in Settings. This deletes your profile, resume, applications, AI key and searches. We
        may suspend or close accounts that break these terms.
      </p>
    ),
  },
  {
    title: "Liability",
    body: (
      <p>
        The service is provided as it is. To the extent the law allows, our total liability to you is limited to the amount you paid us
        in the 12 months before the claim. We are not liable for indirect losses, including missed jobs or opportunities, hiring
        decisions, or charges from your AI provider. Nothing in these terms limits liability that the law does not allow to be limited.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="page-glow min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Logo />
        <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft size={16} aria-hidden="true" /> Home
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <p className="text-sm font-bold uppercase tracking-wider text-primary-text">Terms</p>
        <h1 className="mt-2 text-[34px] font-extrabold leading-tight tracking-[-0.03em] text-fg sm:text-[42px]">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          These terms cover your use of 5AM Apply (&quot;the service&quot;), run by 5 AM Solution, Islamabad, Pakistan (&quot;we&quot;,
          &quot;us&quot;). By creating an account you agree to them. Questions:{" "}
          <a href={`mailto:${EMAIL}`} className="font-semibold text-fg underline underline-offset-2">
            {EMAIL}
          </a>
          .
        </p>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface shadow-xs">
          {SECTIONS.map((s) => (
            <section key={s.title} className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-fg">{s.title}</h2>
              <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted [&_li]:relative [&_li]:pl-4 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:rounded-full [&_li]:before:bg-primary [&_ul]:space-y-1.5">
                {s.body}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted">
          See also our{" "}
          <Link href="/privacy" className="font-semibold text-fg underline underline-offset-2">
            privacy notes
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
