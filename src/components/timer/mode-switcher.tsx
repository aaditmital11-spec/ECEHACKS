"use client";

import { Flame, Leaf, NotebookPen, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { modeMeta, studyPresets } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PomodoroConfig, TimerMode } from "@/types/app";

const presetIcons = {
  chill: Leaf,
  regular: NotebookPen,
  exams: Flame,
} as const;

export function ModeSwitcher({
  value,
  pomodoroConfig,
  onChange,
  onApplyPreset,
  disabled = false,
}: {
  value: TimerMode;
  pomodoroConfig: PomodoroConfig;
  onChange: (mode: TimerMode) => void;
  onApplyPreset: (focusMin: number, breakMin: number) => void;
  disabled?: boolean;
}) {
  const matchedPreset = studyPresets.find(
    (preset) =>
      preset.focusMin === pomodoroConfig.focusDurationMin && preset.breakMin === pomodoroConfig.shortBreakDurationMin,
  )?.id;

  return (
    <div className="grid gap-2 md:grid-cols-4">
      <Button
        variant={value === "pomodoro" && !matchedPreset ? "default" : "secondary"}
        className={cn(
          "h-auto justify-start rounded-2xl px-4 py-4",
          !(value === "pomodoro" && !matchedPreset) && "text-left",
        )}
        disabled={disabled}
        onClick={() => onChange("pomodoro")}
      >
        <Timer className="mt-0.5 size-4 shrink-0" />
        <span className="flex flex-col items-start">
          <span>{modeMeta.pomodoro.label}</span>
          <span
            className={cn(
              "text-xs",
              value === "pomodoro" && !matchedPreset ? "text-[#111315]/80" : "text-[var(--text-subtle)]",
            )}
          >
            {modeMeta.pomodoro.compactDescription}
          </span>
        </span>
      </Button>

      {studyPresets.map((preset) => {
        const Icon = presetIcons[preset.id];
        const active = value === "pomodoro" && matchedPreset === preset.id;

        return (
          <Button
            key={preset.id}
            variant={active ? "default" : "secondary"}
            className={cn("h-auto justify-start rounded-2xl px-4 py-4", !active && "text-left")}
            disabled={disabled}
            onClick={() => {
              onChange("pomodoro");
              onApplyPreset(preset.focusMin, preset.breakMin);
            }}
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
