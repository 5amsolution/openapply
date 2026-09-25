"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { updateApplicationAction } from "@/app/(app)/actions";
import { Badge, ScoreBadge, cn } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import { StatusSelect } from "@/components/status-select";
import { friendlyError } from "@/components/progress";
import { toast } from "@/components/toast";
import { STATUS_LABELS, timeAgo } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/types";

export type BoardItem = {
  id: string;
  status: ApplicationStatus;
  match_score: number | null;
  origin: string;
  updated_at: string;
  applied_at: string | null;
  job: { title: string; company: string; company_logo: string | null } | null;
};

const TINT: Record<string, string> = {
  saved: "pastel-cool",
  ready: "pastel-lime",
  applied: "pastel-lavender",
  interviewing: "pastel-peach",
  offer: "pastel-pink",
  rejected: "bg-surface-2",
  archived: "bg-surface-2",
};

/** Kanban board: drag cards between columns (desktop) or use the status menu (touch). */
export function ApplicationsBoard({ items: initial, columns }: { items: BoardItem[]; columns: ApplicationStatus[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<ApplicationStatus | null>(null);

  const move = async (id: string, to: ApplicationStatus) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.status === to) return;
    const from = item.status;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: to, updated_at: new Date().toISOString() } : i)));
    try {
      const res = await updateApplicationAction(id, { status: to });
      if (!res.ok) throw new Error(res.error);
      toast(`${item.job?.title ?? "Application"} → ${STATUS_LABELS[to]}`);
      router.refresh();
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: from } : i)));
      toast(friendlyError(e), { tone: "error" });
    }
  };

  return (
    <div
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0",
        columns.length > 1 ? "md:grid md:snap-none md:overflow-visible" : "",
      )}
      style={columns.length > 1 ? { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` } : undefined}
    >
      {columns.map((status) => {
        const list = items.filter((i) => i.status === status);
        return (
          <section
            key={status}
            className={cn(
              "flex w-[80vw] max-w-[320px] shrink-0 snap-start flex-col rounded-[20px] p-2 transition md:w-auto md:max-w-none",
              TINT[status],
              over === status && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
              columns.length === 1 && "w-full max-w-none",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = dragId;
              setDragId(null);
              if (id) void move(id, status);
            }}
            aria-label={`${STATUS_LABELS[status]} (${list.length})`}
          >
            <h2 className="flex items-center justify-between px-2 pb-2 pt-1 text-sm font-semibold">
              {STATUS_LABELS[status]}
              <span className="rounded-full bg-surface/80 px-2 py-0.5 text-xs text-muted">{list.length}</span>
            </h2>
            <div className="grid min-h-24 content-start gap-2">
              {list.map((a) => (
                <article
                  key={a.id}
                  draggable
                  onDragStart={() => setDragId(a.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOver(null);
                  }}
                  className={cn(
                    "group rounded-2xl bg-surface p-3 shadow-[var(--card-shadow)] transition md:cursor-grab md:active:cursor-grabbing",
                    dragId === a.id && "opacity-50",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <CompanyLogo src={a.job?.company_logo ?? null} company={a.job?.company ?? "?"} size={30} />
                    <Link href={`/applications/${a.id}`} className="min-w-0 flex-1 hover:text-accent">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{a.job?.title}</p>
                      <p className="truncate text-xs text-muted">{a.job?.company}</p>
                    </Link>
                    <GripVertical size={14} className="mt-0.5 hidden shrink-0 text-muted/60 md:block" aria-hidden="true" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <ScoreBadge score={a.match_score} />
                    {a.origin === "autopilot" && <Badge tone="info">Autopilot</Badge>}
                    <span className="text-[11px] text-muted">{timeAgo(a.applied_at ?? a.updated_at)}</span>
                  </div>
                  <div className="mt-2 md:hidden">
                    <StatusSelect key={a.status} id={a.id} status={a.status} compact />
                  </div>
                </article>
              ))}
              {list.length === 0 && (
                <p className="rounded-2xl border border-dashed border-fg/15 px-3 py-6 text-center text-xs text-muted">
                  {dragId ? "Drop here" : "Nothing here yet"}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
