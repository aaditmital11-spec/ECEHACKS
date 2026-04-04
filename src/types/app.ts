export const studyModes = ["chill", "regular", "exams"] as const;
export const timerModes = ["chill", "regular", "exams", "countdown", "stopwatch", "deep-focus"] as const;
export const pomodoroPhases = ["focus", "short-break", "long-break"] as const;
export const sessionStatuses = ["completed", "interrupted"] as const;
export const appThemes = ["graphite", "midnight", "sage"] as const;
export const presenceServiceStatuses = ["offline", "connecting", "ready", "error"] as const;
export const presenceCameraStatuses = ["offline", "connecting", "streaming", "error"] as const;
export const sessionFailureReasons = ["extended-absence"] as const;

export type StudyMode = (typeof studyModes)[number];
export type TimerMode = (typeof timerModes)[number];
export type PomodoroPhase = (typeof pomodoroPhases)[number];
export type SessionStatus = (typeof sessionStatuses)[number];
export type AppTheme = (typeof appThemes)[number];
export type PresenceServiceStatus = (typeof presenceServiceStatuses)[number];
export type PresenceCameraStatus = (typeof presenceCameraStatuses)[number];
export type SessionFailureReason = (typeof sessionFailureReasons)[number];

export interface SubjectOption {
  id: string;
  label: string;
  color: string;
  textColor: string;
}

export interface SessionRecord {
  id: string;
  mode: TimerMode;
  subjectId: string;
  subjectLabel: string;
  note?: string;
  plannedDurationMs?: number;
  actualDurationMs: number;
  startedAt: number;
  endedAt: number;
  status: SessionStatus;
}

export interface TodoItem {
  id: string;
  text: string;
  createdAt: number;
  completedAt: number | null;
}

export interface PomodoroConfig {
  focusDurationMin: number;
  shortBreakDurationMin: number;
  longBreakDurationMin: number;
  cyclesBeforeLongBreak: number;
  autoStartNextPhase: boolean;
  autoStartBreak: boolean;
}

export interface CountdownConfig {
  durationMin: number;
}

export interface ActiveTimerSession {
  id: string;
  mode: TimerMode;
  subjectId: string;
  note: string;
  startedAt: number | null;
  endedAt: number | null;
  isRunning: boolean;
  pausedAt: number | null;
  lastResumedAt: number | null;
  accumulatedMs: number;
  plannedDurationMs?: number;
  pomodoroPhase: PomodoroPhase;
  pomodoroCycle: number;
}

export interface CompletionDraft {
  sessionId: string;
  mode: TimerMode;
  subjectId: string;
  note: string;
  startedAt: number;
  actualDurationMs: number;
  plannedDurationMs?: number;
  completedAsPlanned: boolean;
  endedAt: number;
}

export interface AppSettings {
  theme: AppTheme;
  defaultMode: TimerMode;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  reduceMotion: boolean;
  bathroomBreakDurationSec: number;
  absenceAlertThresholdSec: number;
  presence: {
    enabled: boolean;
    minimumAbsenceSec: number;
    recoveryDurationSec: number;
    autoResume: boolean;
    alarmEnabled: boolean;
    cameraPanelVisible: boolean;
  };
  timerDefaults: {
    pomodoro: PomodoroConfig;
    countdown: CountdownConfig;
    deepFocusDurationMin: number;
  };
}

export interface PresenceServiceSnapshot {
  present: boolean;
  lastSeenTimestamp: number | null;
  absentDurationMs: number;
  confidence: number | null;
  serviceStatus: PresenceServiceStatus;
  cameraStatus: PresenceCameraStatus;
  error: string | null;
  previewAvailable: boolean;
  updatedAt: number;
}

export interface PresenceRuntimeState {
  isPresent: boolean;
  lastPresentAt: number | null;
  absentDurationMs: number;
  hasTriggeredAbsenceEvent: boolean;
  isRecoveryCountdownActive: boolean;
  recoveryStartedAt: number | null;
  recoveryDeadlineAt: number | null;
  recoveryTimeRemainingMs: number;
  isAlarmPlaying: boolean;
  sessionFailureReason: SessionFailureReason | null;
  serviceStatus: PresenceServiceStatus;
  cameraStatus: PresenceCameraStatus;
  serviceError: string | null;
  confidence: number | null;
  previewAvailable: boolean;
  lastServiceUpdateAt: number | null;
  awaitingManualResume: boolean;
}
