import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatDurationLabel } from "@/lib/time";
import { modeMeta } from "@/lib/constants";
import type { ActiveTimerSession, TimerMode } from "@/types/app";

import { LabelChip } from "./label-chip";

function getPhaseLabel(session: ActiveTimerSession | null) {
  if (!session || session.mode !== "pomodoro") {
    return null;
  }

  if (session.pomodoroPhase === "focus") {
    return "Focus block";
  }

  if (session.pomodoroPhase === "short-break") {
    return "Short break";
  }

  return "Long break";
}

export function TimerCard({
  mode,
  activeSession,
  displayMs,
  elapsedMs,
  progress,
  immersive = false,
}: {
  mode: TimerMode;
  activeSession: ActiveTimerSession | null;
  displayMs: number;
  elapsedMs: number;
  progress: number;
  immersive?: boolean;
}) {
  const ringProgress = Math.max(2, Math.round(progress * 100));
  const currentMode = activeSession?.mode ?? mode;
  const phaseLabel = getPhaseLabel(activeSession);
  const plannedLabel = activeSession?.plannedDurationMs
    ? formatDurationLabel(activeSession.plannedDurationMs)
    : "Open-ended";

  return (
    <Card className={immersive ? "rounded-[36px] border-[var(--border-strong)]" : "rounded-[32px]"}>
      <CardContent className={immersive ? "px-8 py-10 md:px-10 md:py-12" : "px-6 py-8 md:px-8 md:py-10"}>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-subtle)]">
                {modeMeta[currentMode].label}
              </p>
              <h3 className={immersive ? "mt-3 text-3xl font-semibold tracking-tight" : "mt-3 text-2xl font-semibold tracking-tight"}>
                {phaseLabel ?? "Session ready"}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                {modeMeta[currentMode].description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LabelChip subjectId={activeSession?.subjectId ?? "coding"} />
              <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
                Planned {plannedLabel}
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <div
              className="relative flex aspect-square w-full max-w-[420px] items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(var(--accent) ${ringProgress}%, rgba(255,255,255,0.08) ${ringProgress}% 100%)`,
              }}
            >
              <div className="absolute inset-[14px] rounded-full bg-[var(--bg-elevated)]" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                  {activeSession?.mode === "stopwatch" ? "Elapsed" : "Remaining"}
                </p>
                <div className={immersive ? "mt-4 text-6xl font-semibold tracking-tight md:text-7xl" : "mt-4 text-5xl font-semibold tracking-tight md:text-6xl"}>
                  {formatDuration(displayMs)}
                </div>
                <p className="mt-3 text-sm text-[var(--text-muted)]">Elapsed {formatDuration(elapsedMs)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Status</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">
                {activeSession ? (activeSession.isRunning ? "In progress" : "Paused") : "Ready"}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Progress</p>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">{Math.round(progress * 100)}%</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Focus state</p>
              <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <Sparkles className="size-4 text-[var(--accent)]" />
                {immersive ? "Immersive" : "Structured"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

