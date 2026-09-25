"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Kanban, LayoutDashboard, Search, Settings, UserRound } from "lucide-react";
import { cn } from "@/components/ui";

const MAIN = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/jobs", label: "Find jobs", short: "Jobs", icon: Search },
  { href: "/applications", label: "Applications", short: "Applied", icon: Kanban },
  { href: "/autopilot", label: "Autopilot", short: "Autopilot", icon: Bot },
];
const ACCOUNT = [
  { href: "/profile", label: "Profile & resume", short: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

type Badges = Partial<Record<string, number>>;

function CountBadge({ n, label }: { n: number; label: string }) {
  return (
    <>
      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-fg" aria-hidden="true">
        {n > 99 ? "99+" : n}
      </span>
      <span className="sr-only">, {label}</span>
    </>
  );
}

/** Sidebar navigation (tablet and desktop). */
export function NavLinks({ badges = {} }: { badges?: Badges }) {
  const pathname = usePathname();
  const item = ({ href, label, icon: Icon }: (typeof MAIN)[number]) => {
    const active = isActive(pathname, href);
    const n = badges[href] ?? 0;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150",
          active ? "bg-primary-soft font-semibold text-primary-soft-fg" : "font-medium text-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        <Icon size={18} aria-hidden="true" className={cn("shrink-0 transition-transform duration-200 group-hover:scale-110", active && "text-primary-text")} />
        {label}
        {n > 0 && <CountBadge n={n} label={`${n} ready to apply`} />}
      </Link>
    );
  };

  return (
    <nav className="grid gap-5 px-3" aria-label="Main">
      <div className="grid gap-1">{MAIN.map(item)}</div>
      <div className="grid gap-1">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-subtle">You</p>
        {ACCOUNT.map(item)}
      </div>
    </nav>
  );
}

/** Bottom tab bar (phones). Settings lives behind the avatar in the top bar. */
export function BottomTabs({ badges = {} }: { badges?: Badges }) {
  const pathname = usePathname();
  const tabs = [...MAIN, ACCOUNT[0]];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Main"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          const n = badges[href] ?? 0;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-xs", active ? "font-semibold text-primary-text" : "font-medium text-muted")}
              >
                <span className={cn("relative flex h-7 w-14 items-center justify-center rounded-full transition-colors duration-200", active && "bg-primary-soft")}>
                  <Icon size={19} aria-hidden="true" />
                  {n > 0 && (
                    <span className="absolute -top-1 right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-fg" aria-hidden="true">
                      {n > 9 ? "9+" : n}
                    </span>
                  )}
                </span>
                {short}
                {n > 0 && <span className="sr-only">, {n} ready to apply</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
