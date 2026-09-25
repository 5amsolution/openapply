import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Bot,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileUp,
  Hand,
  Lock,
  Search,
  Send,
  Sparkles,
  Trophy,
  Users,
  Wand2,
} from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { hasAIConfig } from "@/lib/ai/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, ButtonLink, Card, IconTile, ScoreBadge, SectionTitle, cn, type Tone } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import { STATUS_LABELS, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const PIPELINE: { key: string; tone: Tone; icon: typeof Bookmark }[] = [
  { key: "saved", tone: "neutral", icon: Bookmark },
  { key: "ready", tone: "primary", icon: Sparkles },
  { key: "applied", tone: "info", icon: Send },
  { key: "interviewing", tone: "warn", icon: Users },
  { key: "offer", tone: "success", icon: Trophy },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY = 86_400_000;

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: apps }, { data: runs }, { count: ruleCount }, aiReady, { count: tokenCount }] = await Promise.all([
    supabase.from("profiles").select("full_name, resume_path, skills").eq("id", user.id).single(),
    supabase
      .from("applications")
      .select("id, status, match_score, updated_at, created_at, applied_at, origin, job:jobs(title, company, company_logo)")
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
  const readyCount = counts.get("ready") ?? 0;
  const offers = counts.get("offer") ?? 0;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const rules = ruleCount ?? 0;

  // Activity over the last 7 days (today last).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = today.getTime() + DAY;
  const week = Array.from({ length: 7 }, (_, i) => {
    const start = today.getTime() - (6 - i) * DAY;
    const n = list.filter((a) => {
      const t = new Date(a.created_at).getTime();
      return t >= start && t < start + DAY;
    }).length;
    return { label: DAYS[new Date(start).getDay()], n };
  });
  const weekTotal = week.reduce((s, d) => s + d.n, 0);
  const weekMax = Math.max(1, ...week.map((d) => d.n));
  const appliedThisWeek = list.filter((a) => a.applied_at && now - new Date(a.applied_at).getTime() < 7 * DAY).length;

  const steps = [
    { done: !!profile?.resume_path, label: "Upload your resume", href: "/profile" },
    { done: aiReady, label: "Turn on AI (free)", href: "/settings" },
    { done: counts.size > 0, label: "Save your first job", href: "/jobs" },
    { done: rules > 0, label: "Turn on autopilot", href: "/autopilot" },
    { done: (tokenCount ?? 0) > 0, label: "Connect the autofill extension", href: "/settings#extension" },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const firstRun = list.length === 0;
  const lastRun = runs?.[0];

  const core = [
    {
      done: steps[0].done,
      icon: FileUp,
      tone: "primary" as Tone,
      title: "Upload your resume",
      body: "The AI reads it and fills in your profile. It never adds experience you don't have.",
      href: "/profile",
      cta: "Upload resume",
    },
    {
      done: steps[1].done,
      icon: Wand2,
      tone: "primary" as Tone,
      title: "Turn on free AI",
      body: "Connect your OpenRouter account in one click. Free models, no card, your own spending controls.",
      href: "/settings",
      cta: "Connect AI",
    },
    {
      done: steps[2].done,
      icon: Search,
      tone: "primary" as Tone,
      title: "Find your first job",
      body: "Search every board at once, then let the AI score your fit and write the application.",
      href: "/jobs",
      cta: "Search jobs",
    },
  ];
  const coreDone = core.filter((c) => c.done).length;
  const nextStep = core.find((c) => !c.done);

  const subline = firstRun
    ? "Three quick steps and the AI starts writing tailored applications for you. All free."
    : offers
      ? `You have ${offers === 1 ? "an offer" : `${offers} offers`} on the table. Congratulations!`
      : readyCount
        ? `${readyCount} application${readyCount === 1 ? " is" : "s are"} ready to send. Each one takes about a minute.`
        : appliedThisWeek
          ? `You've sent ${appliedThisWeek} application${appliedThisWeek === 1 ? "" : "s"} this week. Keep the momentum going!`
          : "Search every board at once, or let autopilot bring new matches to you each morning.";

  return (
    <>
      {/* Greeting */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="mb-1.5 text-sm font-semibold text-muted">{firstRun ? "Welcome to 5AM Apply" : "Your job search today"}</p>
          <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] text-fg md:text-[38px]">
            {firstRun ? (firstName ? "Hi" : "Hi there") : "Welcome back"}
            {firstName ? (
              <>
                , <span className="text-primary-text">{firstName}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">{subline}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {readyCount ? (
            <ButtonLink href="/applications?status=ready" size="lg">
              Review ready applications <ArrowRight size={17} aria-hidden="true" />
            </ButtonLink>
          ) : (
            <ButtonLink href={firstRun && nextStep ? nextStep.href : "/jobs"} size="lg">
              {firstRun && nextStep ? nextStep.cta : "Find jobs"} <ArrowRight size={17} aria-hidden="true" />
            </ButtonLink>
          )}
          <ButtonLink href="/autopilot" variant="secondary" size="lg">
            <Bot size={17} aria-hidden="true" /> Autopilot
          </ButtonLink>
        </div>
      </header>

      {lastRun && !lastRun.error && lastRun.finished_at && lastRun.drafts_created > 0 && (
        <Link href="/applications?status=ready" className="lift mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <IconTile tone="primary">
            <Sparkles size={18} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-fg">
              Autopilot wrote {lastRun.drafts_created} application{lastRun.drafts_created === 1 ? "" : "s"} for you
            </p>
            <p className="text-sm text-muted">
              {timeAgo(lastRun.finished_at)} · {lastRun.jobs_found} new jobs checked, {lastRun.jobs_scored} scored
            </p>
          </div>
          <span className="hidden text-sm font-semibold text-primary-text sm:inline">Review</span>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
        </Link>
      )}

      {firstRun ? (
        <>
          <section aria-labelledby="start" className="mb-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="start" className="text-xl font-bold tracking-tight text-fg">
                  Let&apos;s get you your first application
                </h2>
                <p className="mt-0.5 text-sm text-muted">Three steps, about five minutes. Everything here is free.</p>
              </div>
              <p className="text-sm font-semibold text-fg">{coreDone} of 3 done</p>
            </div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <div
                className="bg-brand h-full rounded-full transition-[width] duration-700"
                style={{ width: `${Math.max(4, (coreDone / 3) * 100)}%` }}
              />
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {core.map((c, i) => {
                const isNext = nextStep === c;
                return (
                  <li
                    key={c.title}
                    className={cn(
                      "relative flex flex-col rounded-2xl border bg-surface p-6 shadow-xs",
                      isNext ? "border-primary shadow-md ring-4 ring-ring" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <IconTile tone={c.done ? "success" : c.tone} size="lg">
                        {c.done ? <CheckCircle2 size={22} /> : <c.icon size={22} />}
                      </IconTile>
                      <span className={cn("text-sm font-bold", c.done ? "text-success" : "text-subtle")}>{c.done ? "Done" : `Step ${i + 1}`}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold tracking-tight text-fg">{c.title}</h3>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{c.body}</p>
                    <div className="mt-5">
                      {c.done ? (
                        <Link href={c.href} className="inline-flex h-9 items-center gap-1 text-sm font-semibold text-primary-text hover:underline">
                          Review <ChevronRight size={15} aria-hidden="true" />
                        </Link>
                      ) : (
                        <ButtonLink href={c.href} variant={isNext ? "primary" : "secondary"}>
                          {c.cta} <ArrowRight size={16} aria-hidden="true" />
                        </ButtonLink>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-label="Good to know" className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Sparkles, tone: "primary" as Tone, title: "Free for everyone", body: "No subscription. Your AI runs on your own free OpenRouter account." },
              { icon: Hand, tone: "success" as Tone, title: "You stay in control", body: "Nothing is ever submitted for you. You review and send every application." },
              { icon: Lock, tone: "neutral" as Tone, title: "Private by default", body: "Your resume and keys are encrypted, and you can delete everything any time." },
            ].map((g) => (
              <div key={g.title} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
                <IconTile tone={g.tone} size="sm">
                  <g.icon size={16} />
                </IconTile>
                <div>
                  <p className="text-sm font-bold text-fg">{g.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{g.body}</p>
                </div>
              </div>
            ))}
          </section>
        </>
      ) : (
        <>
          {/* Pipeline */}
          <section aria-label="Your pipeline" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PIPELINE.map(({ key, tone, icon: Icon }) => (
              <Link key={key} href={`/applications?status=${key}`} className="lift group rounded-2xl border border-border bg-surface p-4 shadow-xs sm:p-5">
                <div className="flex items-center justify-between">
                  <IconTile tone={tone} size="sm">
                    <Icon size={16} />
                  </IconTile>
                  <ArrowRight size={16} aria-hidden="true" className="text-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-fg" />
                </div>
                <p className="mt-4 text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-fg">{counts.get(key) ?? 0}</p>
                <p className="mt-1.5 text-sm font-medium text-muted">{STATUS_LABELS[key]}</p>
              </Link>
            ))}
          </section>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5 lg:col-span-2">
              <Card className="p-5 sm:p-6">
                <SectionTitle
                  icon={<Sparkles size={18} />}
                  title="Ready to apply"
                  hint="Tailored and waiting for your review"
                  action={
                    <Link href="/applications?status=ready" className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary-text hover:bg-primary-soft">
                      View all <ChevronRight size={15} aria-hidden="true" />
                    </Link>
                  }
                />
                {ready.length === 0 ? (
                  <div className="rounded-xl bg-surface-2 px-6 py-10 text-center">
                    <p className="font-semibold text-fg">Nothing waiting right now</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Open a job and click Write application, or let autopilot find some for you.</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <ButtonLink href="/jobs">Find jobs</ButtonLink>
                    </div>
                  </div>
                ) : (
                  <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
                    {ready.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/applications/${a.id}`}
                          className="group flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-border hover:bg-surface-2"
                        >
                          <CompanyLogo src={a.job?.company_logo ?? null} company={a.job?.company ?? "?"} size={42} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-fg group-hover:text-primary-text">{a.job?.title}</p>
                            <p className="truncate text-sm text-muted">{a.job?.company}</p>
                          </div>
                          {a.origin === "autopilot" && (
                            <Badge className="hidden sm:inline-flex">
                              <Bot size={12} aria-hidden="true" /> Autopilot
                            </Badge>
                          )}
                          <ScoreBadge score={a.match_score} />
                          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {stepsDone < steps.length && (
                <Card className="p-5 sm:p-6">
                  <SectionTitle
                    icon={<CheckCircle2 size={18} />}
                    tone="success"
                    title="Finish setting up"
                    hint={`${stepsDone} of ${steps.length} done. Each one makes 5AM Apply work harder for you.`}
                  />
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                    <div className="h-full rounded-full bg-success" style={{ width: `${(stepsDone / steps.length) * 100}%` }} />
                  </div>
                  <ul className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-2">
                    {steps.map((s) => (
                      <li key={s.label}>
                        {s.done ? (
                          <span className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted">
                            <CheckCircle2 size={18} aria-hidden="true" className="shrink-0 text-success" />
                            <span className="line-through decoration-border-strong">{s.label}</span>
                            <span className="sr-only">(done)</span>
                          </span>
                        ) : (
                          <Link
                            href={s.href}
                            className="group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-fg transition-colors hover:bg-primary-soft hover:text-primary-soft-fg"
                          >
                            <Circle size={18} aria-hidden="true" className="shrink-0 text-subtle" />
                            <span className="flex-1">{s.label}</span>
                            <ChevronRight size={16} aria-hidden="true" className="text-subtle transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
              {/* This week */}
              <Card className="p-5 sm:p-6">
                <h2 className="text-sm font-bold text-fg">This week</h2>
                <div className="mt-3 flex items-end gap-3">
                  <p className="text-[40px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-fg">{weekTotal}</p>
                  <p className="pb-1 text-sm text-muted">job{weekTotal === 1 ? "" : "s"} added to your pipeline</p>
                </div>
                <div className="mt-6 flex h-32 items-end gap-2" role="img" aria-label={`Jobs added per day: ${week.map((d) => `${d.label} ${d.n}`).join(", ")}`}>
                  {week.map((d, i) => {
                    const last = i === week.length - 1;
                    return (
                      <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" aria-hidden="true">
                        <span className="text-xs font-semibold tabular-nums text-muted">{d.n || ""}</span>
                        <div
                          className={cn(
                            "w-full rounded-lg transition-[height] duration-700",
                            last ? "bg-brand" : d.n ? "bg-primary-soft-hover" : "bg-surface-3",
                          )}
                          style={{ height: `${Math.max(8, (d.n / weekMax) * 84)}px` }}
                        />
                        <span className={cn("text-xs", last ? "font-bold text-fg" : "text-muted")}>{last ? "Today" : d.label}</span>
                      </div>
                    );
                  })}
                </div>
                {appliedThisWeek > 0 && (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success-soft-fg">
                    <Send size={15} aria-hidden="true" /> {appliedThisWeek} sent this week. Nice work!
                  </p>
                )}
              </Card>

              {/* Autopilot: always dark, like the logo */}
              <section className="sunrise relative overflow-hidden rounded-2xl border border-border p-6 shadow-md" aria-labelledby="autopilot-card">
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <IconTile tone="primary">
                      <Bot size={19} />
                    </IconTile>
                    <Badge tone={rules > 0 ? "success" : "neutral"}>{rules > 0 ? `${rules} active` : "Off"}</Badge>
                  </div>
                  <h2 id="autopilot-card" className="mt-5 text-xl font-bold tracking-tight text-fg">
                    Autopilot
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {rules > 0 ? "Finds, scores and writes applications for you every day." : "Save a search and it runs every day. New matches arrive ready to send."}
                  </p>
                  <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-2 text-sm">
                    {(runs ?? []).length === 0 ? (
                      <li className="rounded-xl border border-border bg-surface px-3 py-2.5 text-muted">No runs yet.</li>
                    ) : (
                      runs!.slice(0, 3).map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-fg">
                          <span className="truncate">
                            {r.error ? <span className="text-danger">{r.error}</span> : !r.finished_at ? "Running now…" : `${r.drafts_created} written · ${r.jobs_scored} scored`}
                          </span>
                          <span className="shrink-0 text-xs text-muted">{timeAgo(r.started_at)}</span>
                        </li>
                      ))
                    )}
                  </ul>
                  <ButtonLink href="/autopilot" className="mt-5">
                    {rules > 0 ? "Manage autopilot" : "Turn on autopilot"} <ArrowRight size={16} aria-hidden="true" />
                  </ButtonLink>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
