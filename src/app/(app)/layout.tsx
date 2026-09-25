import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { BottomTabs, NavLinks } from "@/components/nav-links";
import { Toaster } from "@/components/toast";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const name = profile?.full_name?.trim() || user.email?.split("@")[0] || "You";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const avatar = (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-ink-fg" aria-hidden="true">
      {initials}
    </span>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <Logo href="/dashboard" />
        <Link href="/settings" className="flex items-center gap-2 rounded-full p-0.5" aria-label="Settings and account">
          {avatar}
        </Link>
      </header>

      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="px-5 py-5">
          <Logo href="/dashboard" />
        </div>
        <NavLinks />
        <div className="mt-auto border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-2xl px-2 py-2">
            {avatar}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted" title={user.email ?? ""}>
                {user.email}
              </p>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <Link href="/settings" className="flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-fg">
              <Settings size={13} /> Settings
            </Link>
            <form action="/auth/signout" method="post">
              <button className="flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-fg" type="submit">
                <LogOut size={13} /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-10 md:py-9">
        <div className="stagger mx-auto max-w-6xl">{children}</div>
      </main>

      <BottomTabs />
      <Toaster />
    </div>
  );
}
