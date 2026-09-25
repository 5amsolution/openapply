import type { Metadata } from "next";
import Link from "next/link";
import { Kanban, Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { ButtonLink, EmptyState, PageHeader, STATUS_DOT, cn } from "@/components/ui";
import { ApplicationsBoard, type BoardItem } from "@/components/applications-board";
import { STATUS_LABELS } from "@/lib/format";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Applications" };

const BOARD: ApplicationStatus[] = ["saved", "ready", "applied", "interviewing", "offer", "rejected"];

export default async function ApplicationsPage(props: PageProps<"/applications">) {
  const sp = await props.searchParams;
  const filter = APPLICATION_STATUSES.find((s) => s === sp.status);
  const { supabase } = await requireUser();

  let query = supabase
    .from("applications")
    .select("id, status, match_score, origin, updated_at, applied_at, job:jobs(id, title, company, company_logo, location, remote)")
    .order("updated_at", { ascending: false })
    .limit(500);
  query = filter ? query.eq("status", filter) : query.neq("status", "archived");
  const [{ data }, { data: all }] = await Promise.all([query, supabase.from("applications").select("status").limit(2000)]);

  type Row = NonNullable<typeof data>[number] & {
    job: { id: string; title: string; company: string; location: string; remote: boolean } | null;
  };
  const apps = (data ?? []) as Row[];
  const columns = filter ? [filter] : BOARD;
  const counts = new Map<string, number>();
  for (const a of all ?? []) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  const active = (all ?? []).filter((a) => a.status !== "archived").length;

  return (
    <>
      <PageHeader
        icon={<Kanban size={22} />}
        eyebrow={<>{active} in your pipeline</>}
        title="Applications"
        description="Everything you've saved, drafted and sent. Drag a card to a new column to update it."
        actions={
          <ButtonLink href="/jobs">
            <Plus size={17} aria-hidden="true" /> Find more jobs
          </ButtonLink>
        }
      />

      <nav aria-label="Filter by status" className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <FilterLink href="/applications" active={!filter} count={active}>
          All
        </FilterLink>
        {APPLICATION_STATUSES.map((s) => (
          <FilterLink key={s} href={`/applications?status=${s}`} active={filter === s} count={counts.get(s) ?? 0} dot={STATUS_DOT[s]}>
            {STATUS_LABELS[s]}
          </FilterLink>
        ))}
      </nav>

      {apps.length === 0 ? (
        <EmptyState
          icon={<Kanban size={22} />}
          title={filter ? `Nothing in “${STATUS_LABELS[filter]}” yet` : "No applications yet"}
          action={<ButtonLink href="/jobs">Find jobs</ButtonLink>}
        >
          Save jobs from search, or let autopilot find matches and write applications for you.
        </EmptyState>
      ) : (
        <ApplicationsBoard key={filter ?? "board"} items={apps as unknown as BoardItem[]} columns={columns} />
      )}
    </>
  );
}

function FilterLink({
  href,
  active,
  count,
  dot,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150",
        active ? "border-transparent bg-fg text-bg" : "border-border-strong bg-surface text-muted hover:text-fg",
      )}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden="true" />}
      {children}
      <span className={cn("tabular-nums", active ? "text-bg" : "text-subtle")}>{count}</span>
    </Link>
  );
}
