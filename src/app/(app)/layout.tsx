import { requireUser } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-border bg-surface md:h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:py-5">
          <Logo href="/dashboard" />
        </div>
        <NavLinks />
        <div className="mt-auto hidden border-t border-border px-5 py-4 text-xs text-muted md:block">
          <p className="truncate" title={user.email ?? ""}>
            {user.email}
          </p>
          <form action="/auth/signout" method="post" className="mt-2">
            <button className="hover:text-fg" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
