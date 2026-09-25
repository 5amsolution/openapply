"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Pencil, Play, Plus, Trash2, Zap } from "lucide-react";
import { deleteRuleAction, runRuleNowAction, saveRuleAction } from "@/app/(app)/actions";
import { Badge, Button, Card, Input, Label, Notice } from "@/components/ui";
import { friendlyError } from "@/components/progress";
import { LiveRun } from "@/components/live-run";
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
  const [message, setMessage] = useState<{ tone: "accent" | "danger"; text: string } | null>(null);
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
        if (text) setMessage({ tone: "accent", text });
        router.refresh();
      } catch (e) {
        setMessage({ tone: "danger", text: friendlyError(e) });
      } finally {
        setBusy("");
      }
    });

  return (
    <div className="grid gap-4">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {rules.map((rule) =>
        editing === rule.id ? (
          <RuleForm
            key={rule.id}
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
          <Card key={rule.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{rule.name}</p>
                {rule.active ? <Badge tone="accent">Active</Badge> : <Badge>Paused</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">
                “{rule.keywords}”{rule.location ? ` in ${rule.location}` : ""}
                {rule.remote_only ? " · remote only" : ""} · score ≥ {rule.min_score} · up to {rule.daily_limit}/day
                {rule.last_run_at ? ` · last run ${timeAgo(rule.last_run_at)}` : " · not run yet"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
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
                {!runs[rule.id] && busy !== `run:${rule.id}` && <Zap size={14} />} {runs[rule.id] ? "Running…" : "Run now"}
              </Button>
              <Button
                variant="ghost"
                disabled={!!busy}
                title={rule.active ? "Pause" : "Resume"}
                onClick={() =>
                  act(`toggle:${rule.id}`, async () => {
                    const res = await saveRuleAction(rule.id, { ...fromRule(rule), active: !rule.active });
                    if (!res.ok) throw new Error(res.error);
                  })
                }
              >
                {rule.active ? <Pause size={14} /> : <Play size={14} />}
              </Button>
              <Button variant="ghost" title="Edit" onClick={() => setEditing(rule.id)}>
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                title="Delete"
                disabled={!!busy}
                onClick={() =>
                  act(`delete:${rule.id}`, async () => {
                    const res = await deleteRuleAction(rule.id);
                    if (!res.ok) throw new Error(res.error);
                  })
                }
              >
                <Trash2 size={14} />
              </Button>
            </div>
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
                          tone: "accent",
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

      {editing === "new" ? (
        <RuleForm
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
      ) : (
        <Button variant="secondary" className="justify-self-start" onClick={() => setEditing("new")}>
          <Plus size={14} /> New autopilot search
        </Button>
      )}
    </div>
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
  initial,
  sources,
  busy,
  onSave,
  onCancel,
}: {
  initial: Draft;
  sources: { id: string; label: string }[];
  busy: boolean;
  onSave: (d: Draft) => void;
  onCancel?: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  return (
    <Card className="p-5">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(d);
        }}
      >
        <div>
          <Label htmlFor="r-name">Name</Label>
          <Input id="r-name" value={d.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
        </div>
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
          <Label htmlFor="r-ex" hint="comma-separated">
            Skip jobs mentioning
          </Label>
          <Input id="r-ex" value={d.exclude_keywords} onChange={(e) => set("exclude_keywords", e.target.value)} placeholder="e.g. senior staff, crypto, unpaid" />
        </div>
        <div>
          <Label htmlFor="r-score" hint={`${d.min_score}+`}>
            Minimum fit score to write an application
          </Label>
          <input
            id="r-score"
            type="range"
            min={40}
            max={95}
            step={5}
            value={d.min_score}
            onChange={(e) => set("min_score", Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>
        <div>
          <Label htmlFor="r-limit" hint="caps your AI spend">
            Max applications per day
          </Label>
          <Input id="r-limit" type="number" min={1} max={50} value={d.daily_limit} onChange={(e) => set("daily_limit", Number(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={d.remote_only} onChange={(e) => set("remote_only", e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Remote only
        </label>
        <details className="md:col-span-2">
          <summary className="cursor-pointer text-sm text-muted">Sources ({d.sources.length || "all"})</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {sources.map((s) => {
              const on = d.sources.length === 0 || d.sources.includes(s.id);
              return (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={on}
                    className="h-4 w-4 accent-[var(--accent)]"
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
        <p className="text-xs text-muted md:col-span-2">
          Rough cost per run: scoring ≈ 3k tokens per job, writing ≈ 6k tokens per application. With {d.daily_limit}/day that’s
          about {Math.round((d.daily_limit * 2 * 3 + d.daily_limit * 6) / 1)}k tokens a day at most.
        </p>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>
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
