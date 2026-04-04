import type { ReactNode } from "react";

import { TopBar } from "@/components/shell/top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1520px] flex-col px-4 py-4 md:px-6 md:py-5">
      <TopBar />
      <main className="mt-4 min-w-0 flex-1">{children}</main>
    </div>
  );
}
