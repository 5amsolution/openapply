import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { ButtonLink, EmptyState, PageHeader, cn } from "@/components/ui";
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
  const { data } = await query;

  type Row = NonNullable<typeof data>[number] & {
    job: { id: string; title: string; company: string; location: string; remote: boolean } | null;
  };
  const apps = (data ?? []) as Row[];
  const columns = filter ? [filter] : BOARD;

  return (
    <>
      <PageHeader
        tint="peach"
        eyebrow={<>📋 {apps.length} in your pipeline</>}
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
          <div className="mt-4">
            <ButtonLink href="/jobs">Find jobs</ButtonLink>
          </div>
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 hidden text-xs text-muted md:block">Drag a card to another column to update its status.</p>
          <ApplicationsBoard key={filter ?? "board"} items={apps as unknown as BoardItem[]} columns={columns} />
        </>
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
