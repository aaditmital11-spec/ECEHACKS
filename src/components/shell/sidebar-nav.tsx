"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History, LayoutDashboard, Settings } from "lucide-react";

import { appName, navItems } from "@/lib/constants";
import { cn } from "@/lib/utils";

const icons = {
  "/app": LayoutDashboard,
  "/app/dashboard": BarChart3,
  "/app/history": History,
  "/app/settings": Settings,
} as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[264px] shrink-0 flex-col rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4 lg:flex">
      <Link
        href="/"
        className="focus-ring rounded-[26px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-7 transition-colors hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.03)]"
      >
        <h1 className="text-[3.35rem] font-semibold leading-none tracking-[-0.07em] text-[var(--text)]">
          {appName}
        </h1>
        <p className="mt-4 max-w-[180px] text-sm leading-6 text-[var(--text-muted)]">
          A focused study timer you can use immediately.
        </p>
      </Link>
      <nav className="mt-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = icons[item.href as keyof typeof icons];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-white/4 hover:text-[var(--text)]",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-[26px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5">
        <p className="text-sm font-medium text-[var(--text)]">Focus with structure</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Multiple timer modes, clear history, and analytics that stay grounded in real sessions.
        </p>
      </div>
    </aside>
  );
}
