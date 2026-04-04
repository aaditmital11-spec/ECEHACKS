import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppEffects } from "@/components/app-effects";

import "./globals.css";

const themeScript = `
(() => {
  const fallbackTheme = "graphite";
  const key = "lockedin-store";
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      document.documentElement.dataset.theme = fallbackTheme;
      document.body.dataset.reduceMotion = "false";
      return;
    }
    const parsed = JSON.parse(raw);
    const state = parsed?.state ?? {};
    document.documentElement.dataset.theme = state?.settings?.theme ?? fallbackTheme;
    document.body.dataset.reduceMotion = String(state?.settings?.reduceMotion ?? false);
  } catch (error) {
    document.documentElement.dataset.theme = fallbackTheme;
    document.body.dataset.reduceMotion = "false";
  }
})();
`;

export const metadata: Metadata = {
  title: "lockedIn. | Study timer platform",
  description: "A serious study timer for students who care about deep work.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppEffects />
        {children}
      </body>
    </html>
  );
}

