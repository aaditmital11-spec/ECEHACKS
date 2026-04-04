"use client";

import { Flame, Leaf, NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { studyPresets } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TimerMode } from "@/types/app";

const presetIcons = {
  chill: Leaf,
  regular: NotebookPen,
  exams: Flame,
} as const;

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
    <div className="grid gap-2 md:grid-cols-3">
      {studyPresets.map((preset) => {
        const Icon = presetIcons[preset.id];
        const active = value === preset.id;

        return (
          <Button
            key={preset.id}
            variant={active ? "default" : "secondary"}
            className={cn("h-auto justify-start rounded-2xl px-4 py-4", !active && "text-left")}
            disabled={disabled}
            onClick={() => onChange(preset.id)}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span className="flex flex-col items-start">
              <span>{preset.label}</span>
              <span className={cn("text-xs", active ? "text-[#111315]/80" : "text-[var(--text-subtle)]")}>
                {preset.focusMin}m study, {preset.breakMin}m break
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
