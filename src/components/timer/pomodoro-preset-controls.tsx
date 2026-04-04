import { studyPresets } from "@/lib/constants";
import type { PomodoroConfig } from "@/types/app";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function minutesLabel(value: number) {
  return `${value} min`;
}

export function PomodoroPresetControls({
  config,
  disabled = false,
  onApplyPreset,
  onFocusChange,
  onBreakChange,
}: {
  config: PomodoroConfig;
  disabled?: boolean;
  onApplyPreset: (focusMin: number, breakMin: number) => void;
  onFocusChange: (focusMin: number) => void;
  onBreakChange: (breakMin: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[var(--text)]">Study intensity</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {studyPresets.map((preset) => (
            <Button
              key={preset.id}
              variant="secondary"
              disabled={disabled}
              className="justify-between rounded-2xl px-4 py-4"
              onClick={() => onApplyPreset(preset.focusMin, preset.breakMin)}
            >
              <span>{preset.label}</span>
              <span className="text-xs text-[var(--text-subtle)]">
                {preset.focusMin}/{preset.breakMin}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--text)]">Study time</p>
            <span className="text-sm text-[var(--text-muted)]">{minutesLabel(config.focusDurationMin)}</span>
          </div>
          <Slider
            min={15}
            max={180}
            step={5}
            disabled={disabled}
            value={config.focusDurationMin}
            onChange={(event) => onFocusChange(Number(event.target.value))}
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--text)]">Break time</p>
            <span className="text-sm text-[var(--text-muted)]">{minutesLabel(config.shortBreakDurationMin)}</span>
          </div>
          <Slider
            min={5}
            max={60}
            step={5}
            disabled={disabled}
            value={config.shortBreakDurationMin}
            onChange={(event) => onBreakChange(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
