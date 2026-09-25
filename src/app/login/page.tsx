import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bot, Check, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const BENEFITS = [
  { icon: Search, title: "Find", body: "Every job board and hundreds of career pages in one search, scored against your resume." },
  { icon: Sparkles, title: "Tailor", body: "A cover letter and answers written for each job from your real experience. Never invented." },
  { icon: Bot, title: "Apply", body: "Everything ready to copy into the employer's form. Autopilot finds new matches every day." },
];

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/dashboard";
  if (user) redirect(next);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel: always dark, like the logo */}
      <section className="sunrise relative hidden overflow-hidden p-10 lg:flex lg:flex-col xl:p-14" aria-label="About 5AM Apply">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
          aria-hidden="true"
        />

        <div className="relative">
          <Logo />
        </div>

        <div className="relative my-auto max-w-md py-10">
          <LogoMark size={96} tile={false} className="drop-shadow-[0_0_28px_rgb(255_122_0/0.45)]" />
          <p className="mt-6 text-[44px] font-extrabold leading-[1.05] tracking-[-0.035em] text-fg">
            Find. Tailor. <span className="text-brand">Apply.</span>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">The free job search that does the busywork, so you can focus on landing the job.</p>
          <ul className="mt-9 grid gap-6">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg ring-1 ring-white/10" aria-hidden="true">
                  <b.icon size={18} />
                </span>
                <div>
                  <p className="font-bold text-fg">{b.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-surface/80 p-4 backdrop-blur-sm animate-[oa-float_6s_ease-in-out_infinite]">
          <span className="bg-brand inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-fg" aria-hidden="true">
            <Check size={20} strokeWidth={3} />
          </span>
          <div>
            <p className="font-bold text-fg">3 applications ready this morning</p>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <ShieldCheck size={14} aria-hidden="true" /> Written by Autopilot · you review and send
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <main id="main" className="page-glow flex flex-col px-5 py-6 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <LoginForm
            initialMode={params.mode === "signup" ? "signup" : "signin"}
            next={next}
            error={typeof params.error === "string" ? params.error : undefined}
            googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true"}
            githubEnabled={process.env.NEXT_PUBLIC_GITHUB_AUTH === "true"}
          />
        </div>
      </main>
    </div>
  );
}
