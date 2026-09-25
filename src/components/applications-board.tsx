"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, GripVertical } from "lucide-react";
import { updateApplicationAction } from "@/app/(app)/actions";
import { Badge, STATUS_DOT, ScoreBadge, cn } from "@/components/ui";
import { CompanyLogo } from "@/components/company-logo";
import { StatusSelect } from "@/components/status-select";
import { friendlyError } from "@/components/progress";
import { toast } from "@/components/toast";
import { celebrate } from "@/lib/celebrate";
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

const EMPTY_HINT: Partial<Record<ApplicationStatus, string>> = {
  saved: "Save jobs from search to keep them here",
  ready: "Applications the AI has written land here",
  applied: "Drag a card here once you've sent it",
  interviewing: "Your interviews will show up here",
  offer: "Where the good news goes",
  rejected: "Nothing here, and that's fine",
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
      if (to === "offer" || to === "interviewing") {
        celebrate();
        toast(to === "offer" ? "An offer! Congratulations!" : "An interview! Nice work!", { tone: "celebrate" });
      } else {
        toast(`${item.job?.title ?? "Application"} → ${STATUS_LABELS[to]}`);
      }
      router.refresh();
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: from } : i)));
      toast(friendlyError(e), { tone: "error" });
    }
  };

  const single = columns.length === 1;

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] md:mx-0 md:snap-none md:px-0">
      {columns.map((status) => {
        const list = items.filter((i) => i.status === status);
        const isOver = over === status;
        return (
          <section
            key={status}
            className={cn(
              "flex w-[82vw] max-w-[290px] shrink-0 snap-start flex-col rounded-2xl border border-border bg-sunken p-2 transition-[box-shadow,background-color] duration-150 md:w-auto md:min-w-[228px] md:max-w-none md:flex-1 md:basis-0",
              isOver && "bg-primary-soft ring-2 ring-primary",
              single && "w-full max-w-none md:w-full",
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
            <h2 className="flex items-center gap-2 px-2 pb-2.5 pt-1.5 text-sm font-bold text-fg">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_DOT[status] }} aria-hidden="true" />
              {STATUS_LABELS[status]}
              <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">{list.length}</span>
            </h2>
            <div className={cn("grid min-h-28 grid-cols-[minmax(0,1fr)] content-start gap-2", single && "sm:grid-cols-2 xl:grid-cols-3")}>
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
                    "group relative rounded-xl border border-border bg-surface p-3 shadow-xs transition-[translate,box-shadow,border-color,opacity] duration-200 hover:-translate-y-0.5 hover:border-hover-border hover:shadow-lg md:cursor-grab md:active:cursor-grabbing",
                    dragId === a.id && "rotate-1 opacity-60",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <CompanyLogo src={a.job?.company_logo ?? null} company={a.job?.company ?? "?"} size={34} />
                    <Link href={`/applications/${a.id}`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-xl after:content-['']">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-fg group-hover:text-primary-text">{a.job?.title}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-muted">{a.job?.company}</p>
                    </Link>
                    <GripVertical size={15} className="mt-0.5 hidden shrink-0 text-subtle md:block" aria-hidden="true" />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <ScoreBadge score={a.match_score} />
                    {a.origin === "autopilot" && (
                      <Badge>
                        <Bot size={12} aria-hidden="true" /> Autopilot
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-muted">{timeAgo(a.applied_at ?? a.updated_at)}</span>
                  </div>
                  <div className="relative z-10 mt-2.5 md:hidden">
                    <StatusSelect key={a.status} id={a.id} status={a.status} compact />
                  </div>
                </article>
              ))}
              {list.length === 0 && (
                <p className="rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-xs leading-relaxed text-muted">
                  {dragId ? "Drop here" : EMPTY_HINT[status] ?? "Nothing here yet"}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
