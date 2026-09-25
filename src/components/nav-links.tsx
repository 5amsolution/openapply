"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Kanban, LayoutDashboard, Search, Settings, UserRound } from "lucide-react";
import { cn } from "@/components/ui";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/jobs", label: "Find jobs", short: "Jobs", icon: Search },
  { href: "/applications", label: "Applications", short: "Applied", icon: Kanban },
  { href: "/autopilot", label: "Autopilot", short: "Autopilot", icon: Bot },
  { href: "/profile", label: "Profile & resume", short: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/** Sidebar navigation (tablet and desktop). */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden flex-col gap-1 px-3 md:flex" aria-label="Main">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm transition duration-200",
              active ? "pastel-lime font-semibold text-fg shadow-[0_0_0_1.5px_rgba(255,255,255,0.8)]" : "text-muted hover:translate-x-1 hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom tab bar (phones). Settings lives in the top bar's avatar button. */
export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Main"
    >
      <ul className="grid grid-cols-5">
        {LINKS.slice(0, 5).map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2 text-[11px] font-medium", active ? "text-fg" : "text-muted")}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition", active && "pastel-lime")}>
                  <Icon size={18} />
                </span>
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
