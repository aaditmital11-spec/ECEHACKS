"use client";

import { useEffect } from "react";

import { useAppStore } from "@/store/app-store";

export function AppEffects() {
  const theme = useAppStore((state) => state.settings.theme);
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.body.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  return null;
}

