import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, ScoreBadge, cn } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";
import { STATUS_LABELS, timeAgo } from "@/lib/format";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Applications" };

const BOARD: ApplicationStatus[] = ["saved", "ready", "applied", "interviewing", "offer", "rejected"];

export default async function ApplicationsPage(props: PageProps<"/applications">) {
  const sp = await props.searchParams;
  const filter = APPLICATION_STATUSES.find((s) => s === sp.status);
  const { supabase } = await requireUser();

  let query = supabase
    .from("applications")
    .select("id, status, match_score, origin, updated_at, applied_at, job:jobs(id, title, company, location, remote)")
    .order("updated_at", { ascending: false })
    .limit(500);
  query = filter ? query.eq("status", filter) : query.neq("status", "archived");
  const { data } = await query;

  type Row = NonNullable<typeof data>[number] & {
    job: { id: string; title: string; company: string; location: string; remote: boolean } | null;
  };
  const apps = (data ?? []) as Row[];
  const columns = filter ? [filter] : BOARD;

  return (
    <>
      <PageHeader
        title="Applications"
        description="Everything you've saved, drafted and sent."
        actions={<ButtonLink href="/jobs">Find more jobs</ButtonLink>}
      />

      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <FilterLink href="/applications" active={!filter}>
          Board
        </FilterLink>
        {APPLICATION_STATUSES.map((s) => (
          <FilterLink key={s} href={`/applications?status=${s}`} active={filter === s}>
            {STATUS_LABELS[s]}
          </FilterLink>
        ))}
      </div>

      {apps.length === 0 ? (
        <EmptyState title={filter ? `Nothing in “${STATUS_LABELS[filter]}”` : "No applications yet"}>
          Save jobs from search or let autopilot draft applications for you.
        </EmptyState>
      ) : (
        <div className={cn("grid gap-4", !filter && "md:grid-flow-col md:auto-cols-[minmax(16rem,1fr)] md:overflow-x-auto md:pb-3")}>
          {columns.map((status) => {
            const items = apps.filter((a) => a.status === status);
            return (
              <section key={status} className="min-w-0">
                <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
                  {STATUS_LABELS[status]} <span className="text-muted">{items.length}</span>
                </h2>
                <div className="grid gap-2">
                  {items.map((a) => (
                    <Card key={a.id} className="p-3">
                      <Link href={`/applications/${a.id}`} className="block hover:opacity-80">
                        <p className="text-sm font-medium leading-snug">{a.job?.title}</p>
                        <p className="text-sm text-muted">{a.job?.company}</p>
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <ScoreBadge score={a.match_score} />
                        {a.origin === "autopilot" && <Badge tone="info">Autopilot</Badge>}
                        <span className="text-xs text-muted">{timeAgo(a.applied_at ?? a.updated_at)}</span>
                      </div>
                      <div className="mt-2">
                        <StatusSelect id={a.id} status={a.status as ApplicationStatus} compact />
                      </div>
                    </Card>
                  ))}
                  {items.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">Empty</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn("rounded-md px-2.5 py-1", active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2")}
    >
      {children}
    </Link>
  );
}
