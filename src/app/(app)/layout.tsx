import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { BottomTabs, NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/toast";
import { Avatar, buttonClass } from "@/components/ui";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count: ready }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "ready"),
  ]);
  const name = profile?.full_name?.trim() || user.email?.split("@")[0] || "You";
  const badges = { "/applications": ready ?? 0 };

  return (
    <div className="min-h-dvh md:flex">
      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md md:hidden">
        <Logo href="/dashboard" />
        <Link href="/settings" className="rounded-full" aria-label="Settings and account">
          <Avatar name={name} size={34} />
        </Link>
      </header>

      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <NavLinks badges={badges} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-border p-3">
          <ThemeToggle className="w-full" />
          <div className="flex items-center gap-3 rounded-xl px-1.5 py-1">
            <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg" title="Your profile">
              <Avatar name={name} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg">{name}</span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </span>
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className={buttonClass("ghost", "icon-sm")} aria-label="Sign out" title="Sign out">
                <LogOut size={17} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main id="main" className="page-glow min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-14 md:pt-8 lg:px-10">
        <div className="stagger mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <BottomTabs badges={badges} />
      <Toaster />
    </div>
  );
}
