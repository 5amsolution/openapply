import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bot, Check, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const BENEFITS = [
  { icon: Search, title: "Every job board in one search", body: "Remote boards and top company career pages, scored against your resume." },
  { icon: Sparkles, title: "Applications written for you", body: "A tailored cover letter and answers for each job — never invented." },
  { icon: Bot, title: "Autopilot while you sleep", body: "New matches arrive each morning, ready for you to review and send." },
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
      {/* Brand panel */}
      <section
        className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col xl:p-14"
        style={{ background: "var(--brand-deep)" }}
        aria-label="About OpenApply"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-[#8b5cf6] opacity-25 blur-3xl" />
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#ec4899] opacity-20 blur-3xl" />
          <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-[#6366f1] opacity-30 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        </div>

        <div className="relative">
          <Logo invert />
        </div>

        <div className="relative my-auto max-w-md py-12">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-[#e0e7ff] ring-1 ring-white/15">
            <ShieldCheck size={15} aria-hidden="true" /> Free for every job seeker
          </p>
          <p className="mt-6 text-[44px] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Your next job,{" "}
            <span className="font-serif text-[1.1em] font-normal italic tracking-normal text-[#c7d2fe]">found for you.</span>
          </p>
          <ul className="mt-10 grid gap-6">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/15" aria-hidden="true">
                  <b.icon size={18} />
                </span>
                <div>
                  <p className="font-bold">{b.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#e0e7ff]">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm animate-[oa-float_6s_ease-in-out_infinite]">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#4338ca]" aria-hidden="true">
            <Check size={20} strokeWidth={3} />
          </span>
          <div>
            <p className="font-bold">3 applications ready this morning</p>
            <p className="text-sm text-[#e0e7ff]">Written overnight by Autopilot · 92% best fit</p>
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
