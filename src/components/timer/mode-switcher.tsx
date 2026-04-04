"use client";

import { Clock3, Hourglass, ScanSearch, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { modeMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TimerMode } from "@/types/app";

const icons = {
  pomodoro: Timer,
  countdown: Hourglass,
  stopwatch: Clock3,
  "deep-focus": ScanSearch,
};

export function ModeSwitcher({
  value,
  onChange,
  disabled = false,
}: {
  value: TimerMode;
  onChange: (mode: TimerMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      {(Object.keys(modeMeta) as TimerMode[]).map((mode) => {
        const Icon = icons[mode];
        const active = mode === value;

        return (
          <Button
            key={mode}
            variant={active ? "default" : "secondary"}
            className={cn("h-auto justify-start rounded-2xl px-4 py-4", !active && "text-left")}
            disabled={disabled}
            onClick={() => onChange(mode)}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span className="flex flex-col items-start">
              <span>{modeMeta[mode].label}</span>
              <span className={cn("text-xs", active ? "text-[#111315]/80" : "text-[var(--text-subtle)]")}>
                {modeMeta[mode].compactDescription}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
