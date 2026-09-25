"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Kanban, LayoutDashboard, Search, Settings, UserRound } from "lucide-react";
import { cn } from "@/components/ui";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Find jobs", icon: Search },
  { href: "/applications", label: "Applications", icon: Kanban },
  { href: "/autopilot", label: "Autopilot", icon: Bot },
  { href: "/profile", label: "Profile & resume", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
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
