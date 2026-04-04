import { getStudyPreset, isStudyMode } from "@/lib/constants";
import { createId } from "@/lib/utils";
import type {
  ActiveTimerSession,
  AppSettings,
  CompletionDraft,
  PomodoroPhase,
  SessionRecord,
  TimerMode,
} from "@/types/app";

export function getStudyDurationMs(mode: TimerMode, settings: AppSettings, phase: PomodoroPhase) {
  const studyPreset = getStudyPreset(mode);
  const config = settings.timerDefaults.pomodoro;

  if (!studyPreset) {
    return undefined;
  }

  if (phase === "short-break") {
    return studyPreset.breakMin * 60000;
  }

  if (phase === "long-break") {
    return config.longBreakDurationMin * 60000;
  }

  return studyPreset.focusMin * 60000;
}

export function getElapsedMs(session: ActiveTimerSession, now = Date.now()) {
  if (session.isRunning && session.lastResumedAt) {
    return session.accumulatedMs + Math.max(0, now - session.lastResumedAt);
  }

  return session.accumulatedMs;
}

export function getRemainingMs(session: ActiveTimerSession, now = Date.now()) {
  if (!session.plannedDurationMs) {
    return 0;
  }

  return Math.max(0, session.plannedDurationMs - getElapsedMs(session, now));
}

export function createTimerSession(input: {
  mode: TimerMode;
  subjectId: string;
  note: string;
  plannedDurationMs?: number;
  pomodoroPhase?: PomodoroPhase;
  pomodoroCycle?: number;
  startImmediately?: boolean;
}) {
  const now = Date.now();

  return {
    id: createId("active"),
    mode: input.mode,
    subjectId: input.subjectId,
    note: input.note,
    startedAt: now,
    endedAt: null,
    isRunning: input.startImmediately ?? true,
    pausedAt: null,
    lastResumedAt: input.startImmediately ?? true ? now : null,
    accumulatedMs: 0,
    plannedDurationMs: input.plannedDurationMs,
    pomodoroPhase: input.pomodoroPhase ?? "focus",
    pomodoroCycle: input.pomodoroCycle ?? 0,
  } satisfies ActiveTimerSession;
}

export function createCompletionDraft(input: {
  session: ActiveTimerSession;
  actualDurationMs: number;
  completedAsPlanned: boolean;
  endedAt?: number;
}) {
  return {
    sessionId: input.session.id,
    mode: input.session.mode,
    subjectId: input.session.subjectId,
    note: input.session.note,
    startedAt: input.session.startedAt ?? (input.endedAt ?? Date.now()) - input.actualDurationMs,
    actualDurationMs: input.actualDurationMs,
    plannedDurationMs: input.session.plannedDurationMs,
    completedAsPlanned: input.completedAsPlanned,
    endedAt: input.endedAt ?? Date.now(),
  } satisfies CompletionDraft;
}

export function createSessionRecord(input: {
  completion: CompletionDraft;
  subjectLabel: string;
  status: SessionRecord["status"];
}) {
  const actualDurationMs = Math.max(1000, input.completion.actualDurationMs);

  return {
    id: createId("session"),
    mode: input.completion.mode,
    subjectId: input.completion.subjectId,
    subjectLabel: input.subjectLabel,
    note: input.completion.note.trim() || undefined,
    plannedDurationMs: input.completion.plannedDurationMs,
    actualDurationMs,
    startedAt: input.completion.startedAt,
    endedAt: input.completion.endedAt,
    status: input.status,
  } satisfies SessionRecord;
}

export function shouldTrackStudySession(session: ActiveTimerSession) {
  return !isStudyMode(session.mode) || session.pomodoroPhase === "focus";
}

export function isPresenceSensitiveSession(session: ActiveTimerSession) {
  return shouldTrackStudySession(session);
}

export function getUpcomingStudyPhase(session: ActiveTimerSession, settings: AppSettings) {
  if (!isStudyMode(session.mode)) {
    return {
      phase: "focus" as const,
      cycle: session.pomodoroCycle,
      autoStart: false,
    };
  }

  if (session.pomodoroPhase === "focus") {
    const nextCycle = session.pomodoroCycle + 1;
    const useLongBreak = nextCycle % settings.timerDefaults.pomodoro.cyclesBeforeLongBreak === 0;

    return {
      phase: useLongBreak ? ("long-break" as const) : ("short-break" as const),
      cycle: nextCycle,
      autoStart: settings.timerDefaults.pomodoro.autoStartBreak,
    };
  }

  return {
    phase: "focus" as const,
    cycle: session.pomodoroCycle,
    autoStart: settings.timerDefaults.pomodoro.autoStartNextPhase,
  };
}
