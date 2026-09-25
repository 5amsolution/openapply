import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Logo />
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Privacy</h1>
      <div className="mt-6 grid gap-5 leading-relaxed text-muted">
        <p>
          <b className="text-fg">What we store.</b> Your account email, the profile and resume you upload, the jobs you save, the
          applications the AI writes for you, your autopilot searches, and your AI provider key (encrypted with AES-256-GCM).
        </p>
        <p>
          <b className="text-fg">Where your data goes.</b> When you use an AI feature, your profile and the job posting are sent to
          the AI provider <i>you</i> chose, using <i>your</i> key, under that provider&apos;s terms. Nothing is sent to anyone else.
          We never sell data and there are no ads or trackers.
        </p>
        <p>
          <b className="text-fg">Job listings.</b> Listings come from public job-board APIs and company career pages. Applications
          are always submitted by you on the employer&apos;s own site.
        </p>
        <p>
          <b className="text-fg">Deleting.</b> Settings → Delete account removes your profile, resume, applications, AI key and
          searches immediately.
        </p>
        <p>
          <b className="text-fg">Open source.</b> All of this can be verified in the source code, and you can self-host your own
          copy.
        </p>
      </div>
    </div>
  );
}
