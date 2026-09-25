"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ChevronDown, Clock3, Gauge, Globe, MapPin, Pause, Pencil, Play, Plus, Search, Target, Trash2, Zap } from "lucide-react";
import { deleteRuleAction, runRuleNowAction, saveRuleAction } from "@/app/(app)/actions";
import { Badge, Button, Card, FieldHint, IconTile, Input, Label, Notice, Switch, cn } from "@/components/ui";
import { friendlyError } from "@/components/progress";
import { LiveRun } from "@/components/live-run";
import { toast } from "@/components/toast";
import { timeAgo } from "@/lib/format";
import type { AutopilotRule } from "@/lib/types";

type Draft = {
  name: string;
  keywords: string;
  location: string;
  remote_only: boolean;
  sources: string[];
  exclude_keywords: string;
  min_score: number;
  daily_limit: number;
};

export function AutopilotManager({
  rules,
  sources,
  defaults,
  aiReady,
  activeRuns,
}: {
  activeRuns: Record<string, string>;
  rules: AutopilotRule[];
  sources: { id: string; label: string }[];
  defaults: { keywords: string; location: string; remoteOnly: boolean };
  aiReady: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(rules.length === 0 ? "new" : null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  // ruleId → id of the run happening in the background right now
  const [runs, setRuns] = useState<Record<string, string>>(activeRuns);
  // Run async work outside a transition so "busy" state renders immediately
  // (state set inside startTransition only shows once the whole action finishes).
  const start = (fn: () => Promise<void>) => void fn();

  const blank: Draft = {
    name: defaults.keywords || "My search",
    keywords: defaults.keywords,
    location: defaults.location,
    remote_only: defaults.remoteOnly,
    sources: [],
    exclude_keywords: "",
    min_score: 70,
    daily_limit: 10,
  };

  const act = (key: string, fn: () => Promise<string | void>) =>
    start(async () => {
      setBusy(key);
      setMessage(null);
      try {
        const text = await fn();
        if (text) setMessage({ tone: "success", text });
        router.refresh();
      } catch (e) {
        setMessage({ tone: "danger", text: friendlyError(e) });
      } finally {
        setBusy("");
      }
    });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-fg">Your autopilot searches</h2>
        {editing !== "new" && (
          <Button variant="secondary" onClick={() => setEditing("new")}>
            <Plus size={16} aria-hidden="true" /> New search
          </Button>
        )}
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {rules.map((rule) =>
        editing === rule.id ? (
          <RuleForm
            key={rule.id}
            title={`Edit “${rule.name}”`}
            initial={{ ...rule, exclude_keywords: rule.exclude_keywords.join(", ") }}
            sources={sources}
            busy={busy === "save"}
            onCancel={() => setEditing(null)}
            onSave={(d) =>
              act("save", async () => {
                const res = await saveRuleAction(rule.id, toInput(d, rule.active));
                if (!res.ok) throw new Error(res.error);
                setEditing(null);
                return "Saved.";
              })
            }
          />
        ) : (
          <Card key={rule.id} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <IconTile tone={rule.active ? "violet" : "neutral"}>
                  <Bot size={19} />
                </IconTile>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-fg">{rule.name}</h3>
                    {rule.active ? (
                      <Badge tone="success">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> Active
                      </Badge>
                    ) : (
                      <Badge>Paused</Badge>
                    )}
                  </div>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Search settings">
                    <Chip icon={<Search size={13} />}>“{rule.keywords}”</Chip>
                    {rule.location && <Chip icon={<MapPin size={13} />}>{rule.location}</Chip>}
                    {rule.remote_only && <Chip icon={<Globe size={13} />}>Remote only</Chip>}
                    <Chip icon={<Target size={13} />}>Fit {rule.min_score}+</Chip>
                    <Chip icon={<Gauge size={13} />}>Up to {rule.daily_limit}/day</Chip>
                    <Chip icon={<Clock3 size={13} />}>{rule.last_run_at ? `Last run ${timeAgo(rule.last_run_at)}` : "Not run yet"}</Chip>
                  </ul>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="soft"
                  disabled={!aiReady || !!busy || !!runs[rule.id]}
                  loading={busy === `run:${rule.id}` || !!runs[rule.id]}
                  onClick={() =>
                    act(`run:${rule.id}`, async () => {
                      const res = await runRuleNowAction(rule.id);
                      if (!res.ok) throw new Error(res.error);
                      setRuns((prev) => ({ ...prev, [rule.id]: res.data }));
                    })
                  }
                >
                  {!runs[rule.id] && busy !== `run:${rule.id}` && <Zap size={16} aria-hidden="true" />} {runs[rule.id] ? "Running…" : "Run now"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!!busy}
                  aria-label={rule.active ? `Pause ${rule.name}` : `Resume ${rule.name}`}
                  title={rule.active ? "Pause" : "Resume"}
                  onClick={() =>
                    act(`toggle:${rule.id}`, async () => {
                      const res = await saveRuleAction(rule.id, { ...fromRule(rule), active: !rule.active });
                      if (!res.ok) throw new Error(res.error);
                      toast(rule.active ? `${rule.name} paused` : `${rule.name} is running again`);
                    })
                  }
                >
                  {rule.active ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Edit ${rule.name}`} title="Edit" onClick={() => setEditing(rule.id)}>
                  <Pencil size={17} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-danger-soft hover:text-danger-soft-fg"
                  aria-label={`Delete ${rule.name}`}
                  title="Delete"
                  disabled={!!busy}
                  onClick={() => setConfirmDelete(rule.id)}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </Button>
              </div>
            </div>

            {confirmDelete === rule.id && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-fg">
                <p className="font-semibold">Delete “{rule.name}”? Applications it already wrote are kept.</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger-solid"
                    size="sm"
                    loading={busy === `delete:${rule.id}`}
                    onClick={() =>
                      act(`delete:${rule.id}`, async () => {
                        const res = await deleteRuleAction(rule.id);
                        if (!res.ok) throw new Error(res.error);
                        setConfirmDelete(null);
                        toast("Search deleted");
                      })
                    }
                  >
                    Delete search
                  </Button>
                </div>
              </div>
            )}

            {runs[rule.id] && (
              <LiveRun
                runId={runs[rule.id]}
                onDone={(st) => {
                  setRuns((prev) => {
                    const next = { ...prev };
                    delete next[rule.id];
                    return next;
                  });
                  setMessage(
                    st.error
                      ? { tone: "danger", text: `${rule.name}: ${st.error}` }
                      : {
                          tone: "success",
                          text: `${rule.name}: found ${st.jobsFound} new jobs, scored ${st.jobsScored}, wrote ${st.draftsCreated} application${st.draftsCreated === 1 ? "" : "s"}${st.draftsCreated ? " — they're in Ready to apply." : "."}`,
                        },
                  );
                  router.refresh();
                }}
              />
            )}
          </Card>
        ),
      )}

      {editing === "new" && (
        <RuleForm
          title={rules.length ? "New autopilot search" : "Create your first autopilot search"}
          initial={blank}
          sources={sources}
          busy={busy === "save"}
          onCancel={rules.length ? () => setEditing(null) : undefined}
          onSave={(d) =>
            act("save", async () => {
              const res = await saveRuleAction(null, toInput(d, true));
              if (!res.ok) throw new Error(res.error);
              setEditing(null);
              return "Autopilot search created. It runs once a day — or click “Run now”.";
            })
          }
        />
      )}
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-[13px] font-medium text-muted">
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </li>
  );
}

function fromRule(r: AutopilotRule) {
  return {
    name: r.name,
    keywords: r.keywords,
    location: r.location,
    remote_only: r.remote_only,
    sources: r.sources,
    exclude_keywords: r.exclude_keywords,
    min_score: r.min_score,
    daily_limit: r.daily_limit,
    active: r.active,
  };
}

function toInput(d: Draft, active: boolean) {
  return {
    ...d,
    active,
    exclude_keywords: d.exclude_keywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

function RuleForm({
  title,
  initial,
  sources,
  busy,
  onSave,
  onCancel,
}: {
  title: string;
  initial: Draft;
  sources: { id: string; label: string }[];
  busy: boolean;
  onSave: (d: Draft) => void;
  onCancel?: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const tokens = d.daily_limit * 2 * 3 + d.daily_limit * 6;

  return (
    <Card className="p-5 shadow-md sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <IconTile tone="primary">
          <Zap size={18} />
        </IconTile>
        <div>
          <h3 className="text-base font-bold text-fg">{title}</h3>
          <p className="text-sm text-muted">Describe the jobs you want — autopilot checks for new ones every day.</p>
        </div>
      </div>
      <form
        className="grid gap-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(d);
        }}
      >
        <div>
          <Label htmlFor="r-kw" hint="what you'd type in a search box">
            Keywords
          </Label>
          <Input id="r-kw" value={d.keywords} onChange={(e) => set("keywords", e.target.value)} required placeholder="e.g. frontend engineer react" />
        </div>
        <div>
          <Label htmlFor="r-loc" hint="optional">
            Location
          </Label>
          <Input id="r-loc" value={d.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. London, Germany, USA" />
        </div>
        <div>
          <Label htmlFor="r-name">Name this search</Label>
          <Input id="r-name" value={d.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
        </div>
        <div>
          <Label htmlFor="r-ex" hint="comma-separated">
            Skip jobs mentioning
          </Label>
          <Input id="r-ex" value={d.exclude_keywords} onChange={(e) => set("exclude_keywords", e.target.value)} placeholder="e.g. senior staff, crypto, unpaid" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="r-score" className="text-sm font-semibold text-fg">
              Only write applications for a fit of
            </label>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-bold tabular-nums text-primary-soft-fg">{d.min_score}+</span>
          </div>
          <input
            id="r-score"
            type="range"
            min={40}
            max={95}
            step={5}
            value={d.min_score}
            onChange={(e) => set("min_score", Number(e.target.value))}
            className="h-11 w-full"
          />
          <FieldHint className="mt-0">Higher means fewer, stronger matches.</FieldHint>
        </div>
        <div>
          <Label htmlFor="r-limit" hint="caps your AI use">
            Max applications per day
          </Label>
          <Input id="r-limit" type="number" min={1} max={50} value={d.daily_limit} onChange={(e) => set("daily_limit", Number(e.target.value))} />
          <FieldHint>About {tokens}k AI tokens a day at most.</FieldHint>
        </div>
        <Switch checked={d.remote_only} onChange={(e) => set("remote_only", e.target.checked)} label="Remote jobs only" />
        <details className="group/src md:col-span-2">
          <summary className="inline-flex h-9 list-none items-center gap-1.5 rounded-lg text-sm font-semibold text-muted hover:text-fg">
            Job sources: {d.sources.length ? `${d.sources.length} selected` : "all"}
            <ChevronDown size={15} aria-hidden="true" className="transition-transform group-open/src:rotate-180" />
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.map((s) => {
              const on = d.sources.length === 0 || d.sources.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                    on ? "border-transparent bg-primary-soft text-primary-soft-fg" : "border-border-strong bg-surface text-muted hover:text-fg",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    className="sr-only"
                    onChange={(e) => {
                      const current = d.sources.length ? d.sources : sources.map((x) => x.id);
                      const next = e.target.checked ? [...current, s.id] : current.filter((x) => x !== s.id);
                      set("sources", next.length === sources.length ? [] : next);
                    }}
                  />
                  {s.label}
                </label>
              );
            })}
          </div>
        </details>
        <div className="flex flex-wrap gap-2 border-t border-border pt-5 md:col-span-2">
          <Button type="submit" loading={busy}>
            {busy ? "Saving…" : "Save search"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
