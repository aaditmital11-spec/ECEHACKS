import type { ReactNode } from "react";

import { SidebarNav } from "@/components/shell/sidebar-nav";
import { TopBar } from "@/components/shell/top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1520px] gap-4 px-4 py-4 lg:px-6">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <TopBar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

