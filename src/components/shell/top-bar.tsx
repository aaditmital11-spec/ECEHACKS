"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { appName, navItems } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
      <Link
        href="/"
        className="focus-ring inline-flex rounded-lg text-sm font-semibold tracking-[-0.04em] text-[var(--text)] transition-colors hover:text-[var(--accent)]"
      >
        {appName}
      </Link>

      <nav className="hidden items-center gap-1 md:flex">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring rounded-full px-4 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-white/4 hover:text-[var(--text)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="icon" variant="secondary" className="md:hidden">
            <Menu className="size-4" />
            <span className="sr-only">Open navigation</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[min(92vw,22rem)] p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring block rounded-2xl px-4 py-3 text-sm text-[var(--text-muted)] hover:bg-white/4 hover:text-[var(--text)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
