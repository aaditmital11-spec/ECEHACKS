import { Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActiveTimerSession } from "@/types/app";

export function TimerControls({
  activeSession,
  onStart,
  onPause,
  onResume,
  onReset,
  onStop,
  onSkipBreak,
}: {
  activeSession: ActiveTimerSession | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStop: () => void;
  onSkipBreak: () => void;
}) {
  if (!activeSession) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={onStart}>
          <Play className="size-4" />
          Start session
        </Button>
        <Button variant="secondary" size="lg" onClick={onReset}>
          <RotateCcw className="size-4" />
          Clear setup
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {activeSession.isRunning ? (
        <Button size="lg" onClick={onPause}>
          <Pause className="size-4" />
          Pause
        </Button>
      ) : (
        <Button size="lg" onClick={onResume}>
          <Play className="size-4" />
          Resume
        </Button>
      )}
      <Button variant="secondary" size="lg" onClick={onReset}>
        <RotateCcw className="size-4" />
        Reset
      </Button>
      <Button variant="secondary" size="lg" onClick={onStop}>
        <Square className="size-4" />
        {activeSession.mode === "pomodoro" && activeSession.pomodoroPhase !== "focus" ? "End break" : "Stop"}
      </Button>
      {activeSession.mode === "pomodoro" && activeSession.pomodoroPhase !== "focus" ? (
        <Button variant="ghost" size="lg" onClick={onSkipBreak}>
          <SkipForward className="size-4" />
          Skip break
        </Button>
      ) : null}
    </div>
  );
}
