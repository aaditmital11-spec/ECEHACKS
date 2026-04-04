import type { PomodoroConfig } from "@/types/app";

import { Slider } from "@/components/ui/slider";

function minutesLabel(value: number) {
  return `${value} min`;
}

export function PomodoroPresetControls({
  config,
  disabled = false,
  onFocusChange,
  onBreakChange,
}: {
  config: PomodoroConfig;
  disabled?: boolean;
  onFocusChange: (focusMin: number) => void;
  onBreakChange: (breakMin: number) => void;
}) {
  return (
    <div className="space-y-5">
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
