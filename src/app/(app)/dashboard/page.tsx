import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bookmark, Bot, CheckCircle2, CircleCheckBig, Kanban, Send, Sparkles, Trophy, Users } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, ButtonLink, Card, ScoreBadge, SectionTitle, cn } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import { STATUS_LABELS, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const STATS = [
  { key: "saved", tint: "pastel-cool", icon: Bookmark },
  { key: "ready", tint: "pastel-lime", icon: Sparkles },
  { key: "applied", tint: "pastel-lavender", icon: Send },
  { key: "interviewing", tint: "pastel-peach", icon: Users },
  { key: "offer", tint: "pastel-pink", icon: Trophy },
] as const;

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: apps }, { data: runs }, { count: ruleCount }, aiReady, { count: tokenCount }] = await Promise.all([
    supabase.from("profiles").select("full_name, resume_path, skills").eq("id", user.id).single(),
    supabase
      .from("applications")
      .select("id, status, match_score, updated_at, created_at, origin, job:jobs(title, company, company_logo)")
      .order("updated_at", { ascending: false })
      .limit(300),
    supabase.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(4),
    supabase.from("autopilot_rules").select("id", { count: "exact", head: true }).eq("active", true),
    hasAIConfig(user.id),
    createAdminClient().from("extension_tokens").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  type Row = NonNullable<typeof apps>[number] & { job: { title: string; company: string; company_logo: string | null } | null };
  const list = (apps ?? []) as Row[];
  const counts = new Map<string, number>();
  for (const a of list) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  const ready = list.filter((a) => a.status === "ready").slice(0, 5);
  const firstName = profile?.full_name?.split(" ")[0];

  // Applications added per day over the last 7 days (today last).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today.getTime() - (6 - i) * 86_400_000);
    const next = day.getTime() + 86_400_000;
    const n = list.filter((a) => {
      const t = new Date(a.created_at).getTime();
      return t >= day.getTime() && t < next;
    }).length;
    return { label: DAYS[day.getDay()], n };
  });
  const weekTotal = week.reduce((s, d) => s + d.n, 0);
  const weekMax = Math.max(1, ...week.map((d) => d.n));

  const steps = [
    { done: !!profile?.resume_path, label: "Upload your resume", href: "/profile" },
    { done: aiReady, label: "Turn on AI (free)", href: "/settings" },
    { done: counts.size > 0, label: "Search and save a job", href: "/jobs" },
    { done: (ruleCount ?? 0) > 0, label: "Turn on autopilot", href: "/autopilot" },
    { done: (tokenCount ?? 0) > 0, label: "Connect the autofill extension", href: "/settings#extension" },
  ];
  const remaining = steps.filter((s) => !s.done);
  const firstRun = list.length === 0;
  const lastRun = runs?.[0];

  const core = [
    { n: 1, done: steps[0].done, title: "Upload your resume", body: "The AI reads it and fills in your profile — it never adds experience you don't have.", href: "/profile", cta: "Upload resume", tint: "pastel-pink" },
    { n: 2, done: steps[1].done, title: "Turn on free AI", body: "Connect your OpenRouter account in one click. Free models, no card, your own spending controls.", href: "/settings", cta: "Connect AI", tint: "pastel-lime" },
    { n: 3, done: steps[2].done, title: "Find your first job", body: "Search every board at once, then let the AI score your fit and write the application.", href: "/jobs", cta: "Search jobs", tint: "pastel-lavender" },
  ];
  const nextStep = core.find((c) => !c.done);

  return (
    <>
      {/* Hero row: greeting + this week */}
      <div className="mb-4 grid gap-4 lg:grid-cols-12">
        <section className="bento pastel-lime relative overflow-hidden p-7 md:p-8 lg:col-span-8">
          <div className="grid-dots pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold shadow-[0_0_0_1.5px_rgba(255,255,255,0.8)]">
              <Sparkles size={12} className="text-accent" /> {firstRun ? "Welcome to OpenApply" : "Your job search today"}
            </p>
            <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#15201a] md:text-[42px] dark:text-fg">
              <span className="text-[#5f8b3e] dark:text-accent">{firstName ? `Hi ${firstName},` : "Hi there,"}</span>
              <br />
              {firstRun
                ? "let's land your next job."
                : ready.length
                  ? `${counts.get("ready")} application${counts.get("ready") === 1 ? " is" : "s are"} ready to send.`
                  : "let's find your next role."}
            </h1>
            <p className="mt-3 max-w-lg text-[15px] text-[#1e2a1b]/75 dark:text-muted">
              {firstRun
                ? "Three quick steps and the AI starts writing tailored applications for you — all free."
                : ready.length
                  ? "Each one has a tailored cover letter and answers. Open it, review, and apply in about a minute."
                  : "Search every board at once, or let autopilot bring new matches to you each morning."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {ready.length ? (
                <ButtonLink href="/applications?status=ready">
                  Review ready applications <ArrowRight size={16} />
                </ButtonLink>
              ) : (
                <ButtonLink href={firstRun && nextStep ? nextStep.href : "/jobs"}>
                  {firstRun && nextStep ? nextStep.cta : "Find jobs"} <ArrowRight size={16} />
                </ButtonLink>
              )}
              <ButtonLink href="/autopilot" variant="secondary">
                <Bot size={16} /> Autopilot
              </ButtonLink>
            </div>
          </div>
          {lastRun && !lastRun.error && lastRun.drafts_created > 0 && (
            <div className="relative mt-6 inline-flex max-w-full items-center gap-3 rounded-2xl bg-[linear-gradient(105deg,#ffffff_34%,#fdeee5_78%,#fce8dd_100%)] px-4 py-3 text-[#0d0d0d] shadow-[0_8px_22px_rgba(64,74,44,0.12)] lg:absolute lg:bottom-7 lg:right-7 lg:mt-0 lg:rotate-[-2deg]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                <Sparkles size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold tracking-tight">
                  {lastRun.drafts_created} application{lastRun.drafts_created === 1 ? "" : "s"} ready!
                </p>
                <p className="truncate text-xs text-[#3b3b3b]">Written by Autopilot · {timeAgo(lastRun.finished_at ?? lastRun.started_at)}</p>
              </div>
            </div>
          )}
        </section>

        <section className="bento pastel-peach flex flex-col p-6 lg:col-span-4" aria-label="Applications this week">
          <span className="self-start rounded-full bg-[linear-gradient(100deg,#fff_18%,#fdeadb_100%)] px-3.5 py-1 text-xs font-bold text-[#111]">This week</span>
          <p className="mt-4 text-[40px] font-extrabold leading-none tracking-[-0.035em]">{weekTotal}</p>
          <p className="mt-1 text-sm text-fg/70">job{weekTotal === 1 ? "" : "s"} added to your pipeline</p>
          <div className="mt-auto flex h-36 items-end gap-2 pt-6" role="img" aria-label={`Per day: ${week.map((d) => `${d.label} ${d.n}`).join(", ")}`}>
            {week.map((d, i) => {
              const last = i === week.length - 1;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "w-full rounded-lg pt-1 text-center text-[11px] font-semibold transition-all duration-700",
                      last ? "bg-[linear-gradient(180deg,#f2b705_0%,#a8a422_52%,#3d7a3e_100%)] text-white shadow-[0_4px_12px_rgba(150,120,20,0.2)]" : "bg-[#e9e3da] text-[#a1978a] dark:bg-white/10",
                    )}
                    style={{ height: `${Math.max(18, (d.n / weekMax) * 104)}px` }}
                  >
                    {d.n || ""}
                  </div>
                  <span className="text-[10px] font-medium tracking-wider text-muted">{d.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* First run: guided steps */}
      {firstRun ? (
        <section className="mb-6" aria-labelledby="start">
          <h2 id="start" className="mb-1 text-lg font-extrabold tracking-tight">
            Let&apos;s get you your first application
          </h2>
          <p className="mb-4 text-sm text-muted">Three steps, about five minutes. Everything here is free.</p>
          <ol className="grid gap-4 md:grid-cols-3">
            {core.map((c) => (
              <li key={c.n} className={cn("bento lift group relative flex flex-col p-6", c.tint)}>
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-sm font-extrabold shadow-sm">
                    {c.done ? <CheckCircle2 size={18} className="text-accent" /> : c.n}
                  </span>
                  {c.done && <span className="rounded-full bg-surface/80 px-2.5 py-0.5 text-xs font-semibold text-accent">Done</span>}
                </div>
                <h3 className="mt-5 text-lg font-extrabold tracking-tight">{c.title}</h3>
                <p className="mt-1 flex-1 text-sm text-fg/70">{c.body}</p>
                <div className="mt-5">
                  {c.done ? (
                    <Link href={c.href} className="text-sm font-semibold underline underline-offset-2">
                      Review
                    </Link>
                  ) : (
                    <ButtonLink href={c.href} variant={nextStep === c ? "primary" : "secondary"}>
                      {c.cta}
                    </ButtonLink>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <>
          {/* Pipeline tiles */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STATS.map(({ key, tint, icon: Icon }) => (
              <Link key={key} href={`/applications?status=${key}`} className={cn("bento lift group p-5", tint)}>
                <div className="flex items-center justify-between">
                  <span className="chip-icon bg-surface/80">
                    <Icon size={16} />
                  </span>
                  <ArrowRight size={14} className="text-fg/40 transition group-hover:translate-x-0.5 group-hover:text-fg" />
                </div>
                <p className="mt-4 text-[34px] font-extrabold leading-none tracking-[-0.035em] tabular-nums">{counts.get(key) ?? 0}</p>
                <p className="mt-1.5 text-sm font-medium text-fg/70">{STATUS_LABELS[key]}</p>
              </Link>
            ))}
          </div>

          {remaining.length > 0 && (
            <Card className="mb-4 p-5">
              <SectionTitle
                icon={<CircleCheckBig size={16} />}
                tint="lavender"
                title="Finish setting up"
                hint={`${steps.length - remaining.length} of ${steps.length} done`}
              />
              <div className="flex flex-wrap gap-2">
                {remaining.map((s) => (
                  <Link key={s.label} href={s.href} className="lift rounded-full bg-surface-2 px-3.5 py-2 text-sm font-medium hover:bg-accent-soft">
                    {s.label} →
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="p-6 lg:col-span-8">
              <SectionTitle
                icon={<Kanban size={16} />}
                tint="lime"
                title="Ready to apply"
                hint="Tailored and waiting for your review"
                action={
                  <Link href="/applications?status=ready" className="text-sm font-semibold text-muted hover:text-fg">
                    View all →
                  </Link>
                }
              />
              {ready.length === 0 ? (
                <div className="rounded-2xl bg-surface-2 px-6 py-10 text-center">
                  <p className="font-semibold">Nothing waiting right now</p>
                  <p className="mt-1 text-sm text-muted">Open a job and click Write application — or let autopilot find some.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <ButtonLink href="/jobs">Find jobs</ButtonLink>
                  </div>
                </div>
              ) : (
                <ul className="grid gap-2">
                  {ready.map((a) => (
                    <li key={a.id}>
                      <Link href={`/applications/${a.id}`} className="lift group flex items-center gap-3 rounded-2xl bg-surface-2/60 p-3 hover:bg-surface">
                        <CompanyLogo src={a.job?.company_logo ?? null} company={a.job?.company ?? "?"} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold group-hover:text-accent">{a.job?.title}</p>
                          <p className="truncate text-sm text-muted">{a.job?.company}</p>
                        </div>
                        {a.origin === "autopilot" && <Badge tone="info">Autopilot</Badge>}
                        <ScoreBadge score={a.match_score} />
                        <ArrowRight size={16} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-fg" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <section className="bento relative overflow-hidden bg-[#15201a] p-6 text-[#f3f5b0] lg:col-span-4 dark:border-white/10 dark:bg-[#1c2a1f]">
              <div className="flex items-center justify-between">
                <span className="chip-icon bg-white/10">
                  <Bot size={16} />
                </span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", (ruleCount ?? 0) > 0 ? "bg-[#e9f0c4] text-[#15201a]" : "bg-white/10")}>
                  {(ruleCount ?? 0) > 0 ? `${ruleCount} active` : "Off"}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-extrabold tracking-tight">Autopilot</h2>
              <p className="mt-1 text-sm opacity-75">
                {(ruleCount ?? 0) > 0 ? "Finds, scores and writes applications for you every morning." : "Save a search and it runs every day — new matches arrive ready to send."}
              </p>
              <ul className="mt-5 grid gap-2 text-sm">
                {(runs ?? []).length === 0 ? (
                  <li className="rounded-xl bg-white/5 px-3 py-2.5 opacity-75">No runs yet.</li>
                ) : (
                  runs!.slice(0, 3).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2.5">
                      <span className="truncate">
                        {r.error ? <span className="text-[#ffb4a8]">{r.error}</span> : !r.finished_at ? "Running now…" : `${r.drafts_created} written · ${r.jobs_scored} scored`}
                      </span>
                      <span className="shrink-0 text-xs opacity-60">{timeAgo(r.started_at)}</span>
                    </li>
                  ))
                )}
              </ul>
              <Link
                href="/autopilot"
                className="sheen mt-5 inline-flex items-center gap-2 rounded-full bg-[#e9f0c4] px-4 py-2 text-sm font-semibold text-[#15201a] transition hover:-translate-y-0.5"
              >
                {(ruleCount ?? 0) > 0 ? "Manage autopilot" : "Turn on autopilot"} <ArrowRight size={15} />
              </Link>
            </section>
          </div>
        </>
      )}
    </>
  );
}
