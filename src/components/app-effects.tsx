"use client";

import { useEffect } from "react";

import { usePresenceMonitor } from "@/hooks/use-presence-monitor";
import { useAppStore } from "@/store/app-store";

export function AppEffects() {
  const theme = useAppStore((state) => state.settings.theme);
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);

  usePresenceMonitor();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.body.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  return null;
}
