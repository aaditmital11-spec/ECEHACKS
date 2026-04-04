"use client";

import { Bath, BellRing, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDuration, formatSecondsLabel } from "@/lib/time";

export function BathroomBreakCard({
  breakDurationSec,
  absenceAlertThresholdSec,
  activeBathroomBreak,
  remainingMs,
  disabled = false,
  onBreakDurationChange,
  onThresholdChange,
  onStart,
  onCancel,
}: {
  breakDurationSec: number;
  absenceAlertThresholdSec: number;
  activeBathroomBreak: { id: string; startedAt: number; endsAt: number; alertedAt: number | null } | null;
  remainingMs: number;
  disabled?: boolean;
  onBreakDurationChange: (seconds: number) => void;
  onThresholdChange: (seconds: number) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text)]">
            <Bath className="size-3.5" />
            Bathroom break
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Start a quick away timer and control when the return alarm should trigger.
          </p>
        </div>
        {activeBathroomBreak ? (
          <div className="rounded-2xl border border-[var(--border)] px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-subtle)]">Break running</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
              {formatDuration(remainingMs)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--text)]">Bathroom break length</p>
            <span className="text-sm text-[var(--text-muted)]">{formatSecondsLabel(breakDurationSec)}</span>
          </div>
          <Slider
            min={30}
            max={600}
            step={30}
            disabled={disabled || Boolean(activeBathroomBreak)}
            value={breakDurationSec}
            onChange={(event) => onBreakDurationChange(Number(event.target.value))}
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--text)]">Away alarm threshold</p>
            <span className="text-sm text-[var(--text-muted)]">{formatSecondsLabel(absenceAlertThresholdSec)}</span>
          </div>
          <Slider
            min={5}
            max={300}
            step={5}
            disabled={disabled || Boolean(activeBathroomBreak)}
            value={absenceAlertThresholdSec}
            onChange={(event) => onThresholdChange(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {activeBathroomBreak ? (
          <Button variant="secondary" onClick={onCancel}>
            <TimerReset className="size-4" />
            Cancel break
          </Button>
        ) : (
          <Button variant="secondary" disabled={disabled} onClick={onStart}>
            <Bath className="size-4" />
            Start {formatSecondsLabel(breakDurationSec)} break
          </Button>
        )}
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)]">
          <BellRing className="size-4 text-[var(--accent)]" />
          Alarm after {formatSecondsLabel(absenceAlertThresholdSec)} away
        </div>
      </div>
    </div>
  );
}

