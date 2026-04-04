"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MoonStar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { navItems } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";

const titles: Record<string, { title: string; description: string }> = {
  "/app": { title: "Overview", description: "Your study system at a glance." },
  "/app/timer": { title: "Timer", description: "Run structured focus sessions with calm control." },
  "/app/dashboard": { title: "Dashboard", description: "See where your focus time is actually going." },
  "/app/history": { title: "History", description: "Review completed sessions and clean up the log." },
  "/app/settings": { title: "Settings", description: "Tune defaults, notifications, and motion preferences." },
};

export function TopBar() {
  const pathname = usePathname();
  const theme = useAppStore((state) => state.settings.theme);
  const current = titles[pathname] ?? titles["/app"];

  return (
    <header className="flex flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon" variant="secondary" className="lg:hidden">
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
        <div>
          <Link
            href="/"
            className="focus-ring inline-flex rounded-lg text-xs uppercase tracking-[0.22em] text-[var(--text-subtle)] transition-colors hover:text-[var(--text)]"
          >
            lockedIn.
          </Link>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text)]">{current.title}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{current.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[var(--text-muted)] md:flex">
          <MoonStar className="size-4 text-[var(--accent)]" />
          <span className="capitalize">{theme}</span>
        </div>
      </div>
    </header>
  );
}
