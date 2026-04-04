"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { defaultSettings } from "@/lib/constants";
import { createId } from "@/lib/utils";
import type {
  ActiveTimerSession,
  AppSettings,
  CompletionDraft,
  PomodoroConfig,
  PresenceRuntimeState,
  SessionRecord,
  TodoItem,
  TimerMode,
} from "@/types/app";
import { timerModes } from "@/types/app";

function migrateLegacyMode(mode: unknown, fallback = defaultSettings.defaultMode): TimerMode {
  if (typeof mode === "string" && timerModes.includes(mode as TimerMode)) {
    return mode as TimerMode;
  }

  if (mode === "pomodoro") {
    return "regular";
  }

  return fallback;
}

function migrateMinimumAbsence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return defaultSettings.presence.minimumAbsenceSec;
  }

  if (value === 20) {
    return 10;
  }

  return value;
}

interface AppStoreState {
  hydrated: boolean;
  settings: AppSettings;
  sessions: SessionRecord[];
  todos: TodoItem[];
  activeMode: TimerMode;
  selectedSubjectId: string;
  quickNote: string;
  activeSession: ActiveTimerSession | null;
  activeBathroomBreak: { id: string; startedAt: number; endsAt: number; alertedAt: number | null } | null;
  presenceRuntime: PresenceRuntimeState;
  completionDraft: CompletionDraft | null;
  setHydrated: (value: boolean) => void;
  setActiveMode: (mode: TimerMode) => void;
  setSelectedSubjectId: (subjectId: string) => void;
  setQuickNote: (note: string) => void;
  setTheme: (theme: AppSettings["theme"]) => void;
  updateSettings: (updater: (settings: AppSettings) => AppSettings) => void;
  updatePomodoroDefaults: (patch: Partial<PomodoroConfig>) => void;
  updateCountdownDefault: (durationMin: number) => void;
  updateDeepFocusDefault: (durationMin: number) => void;
  setBathroomBreakDurationSec: (seconds: number) => void;
  setAbsenceAlertThresholdSec: (seconds: number) => void;
  updatePresenceSettings: (patch: Partial<AppSettings["presence"]>) => void;
  setDefaultMode: (mode: TimerMode) => void;
  setToggleSetting: (
    key: "soundEnabled" | "notificationsEnabled" | "reduceMotion",
    value: boolean,
  ) => void;
  setActiveSession: (session: ActiveTimerSession | null) => void;
  patchActiveSession: (patch: Partial<ActiveTimerSession>) => void;
  setActiveBathroomBreak: (
    bathroomBreak: { id: string; startedAt: number; endsAt: number; alertedAt: number | null } | null,
  ) => void;
  patchActiveBathroomBreak: (
    patch: Partial<{ id: string; startedAt: number; endsAt: number; alertedAt: number | null }>,
  ) => void;
  patchPresenceRuntime: (patch: Partial<PresenceRuntimeState>) => void;
  resetPresenceRuntime: () => void;
  setCompletionDraft: (draft: CompletionDraft | null) => void;
  updateCompletionNote: (note: string) => void;
  addSession: (session: SessionRecord) => void;
  addTodo: (text: string) => void;
  toggleTodo: (todoId: string) => void;
  deleteTodo: (todoId: string) => void;
  clearCompletedTodos: () => void;
  deleteSession: (sessionId: string) => void;
  clearSessions: () => void;
  resetAllData: () => void;
}

const initialState = {
  settings: defaultSettings,
  sessions: [] as SessionRecord[],
  todos: [] as TodoItem[],
  activeMode: defaultSettings.defaultMode,
  selectedSubjectId: "coding",
  quickNote: "",
  activeSession: null as ActiveTimerSession | null,
  activeBathroomBreak: null as { id: string; startedAt: number; endsAt: number; alertedAt: number | null } | null,
  presenceRuntime: {
    isPresent: true,
    lastPresentAt: null,
    absentDurationMs: 0,
    hasTriggeredAbsenceEvent: false,
    isRecoveryCountdownActive: false,
    recoveryStartedAt: null,
    recoveryDeadlineAt: null,
    recoveryTimeRemainingMs: 0,
    isAlarmPlaying: false,
    sessionFailureReason: null,
    serviceStatus: "offline",
    cameraStatus: "offline",
    serviceError: null,
    confidence: null,
    previewAvailable: false,
    lastServiceUpdateAt: null,
    awaitingManualResume: false,
  } satisfies PresenceRuntimeState,
  completionDraft: null as CompletionDraft | null,
};

export const useAppStore = create<AppStoreState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...initialState,
      setHydrated: (value) => set({ hydrated: value }),
      setActiveMode: (mode) => set({ activeMode: mode }),
      setSelectedSubjectId: (subjectId) => set({ selectedSubjectId: subjectId }),
      setQuickNote: (quickNote) => set({ quickNote }),
      setTheme: (theme) =>
        set((state) => ({
          settings: {
            ...state.settings,
            theme,
          },
        })),
      updateSettings: (updater) => set((state) => ({ settings: updater(state.settings) })),
      updatePomodoroDefaults: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            timerDefaults: {
              ...state.settings.timerDefaults,
              pomodoro: {
                ...state.settings.timerDefaults.pomodoro,
                ...patch,
              },
            },
          },
        })),
      updateCountdownDefault: (durationMin) =>
        set((state) => ({
          settings: {
            ...state.settings,
            timerDefaults: {
              ...state.settings.timerDefaults,
              countdown: {
                durationMin,
              },
            },
          },
        })),
      updateDeepFocusDefault: (durationMin) =>
        set((state) => ({
          settings: {
            ...state.settings,
            timerDefaults: {
              ...state.settings.timerDefaults,
              deepFocusDurationMin: durationMin,
            },
          },
        })),
      setBathroomBreakDurationSec: (seconds) =>
        set((state) => ({
          settings: {
            ...state.settings,
            bathroomBreakDurationSec: seconds,
          },
        })),
      setAbsenceAlertThresholdSec: (seconds) =>
        set((state) => ({
          settings: {
            ...state.settings,
            absenceAlertThresholdSec: seconds,
          },
        })),
      updatePresenceSettings: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            presence: {
              ...state.settings.presence,
              ...patch,
            },
          },
        })),
      setDefaultMode: (mode) =>
        set((state) => ({
          activeMode: mode,
          settings: {
            ...state.settings,
            defaultMode: mode,
          },
        })),
      setToggleSetting: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        })),
      setActiveSession: (activeSession) => set({ activeSession }),
      patchActiveSession: (patch) =>
        set((state) => ({
          activeSession: state.activeSession ? { ...state.activeSession, ...patch } : null,
        })),
      setActiveBathroomBreak: (activeBathroomBreak) => set({ activeBathroomBreak }),
      patchActiveBathroomBreak: (patch) =>
        set((state) => ({
          activeBathroomBreak: state.activeBathroomBreak ? { ...state.activeBathroomBreak, ...patch } : null,
        })),
      patchPresenceRuntime: (patch) =>
        set((state) => ({
          presenceRuntime: {
            ...state.presenceRuntime,
            ...patch,
          },
        })),
      resetPresenceRuntime: () =>
        set((state) => ({
          presenceRuntime: {
            ...initialState.presenceRuntime,
            serviceStatus: state.presenceRuntime.serviceStatus,
            cameraStatus: state.presenceRuntime.cameraStatus,
            serviceError: state.presenceRuntime.serviceError,
            confidence: state.presenceRuntime.confidence,
            previewAvailable: state.presenceRuntime.previewAvailable,
            lastServiceUpdateAt: state.presenceRuntime.lastServiceUpdateAt,
            isPresent: state.presenceRuntime.isPresent,
            lastPresentAt: state.presenceRuntime.lastPresentAt,
            absentDurationMs: state.presenceRuntime.absentDurationMs,
          },
        })),
      setCompletionDraft: (completionDraft) => set({ completionDraft }),
      updateCompletionNote: (note) =>
        set((state) => ({
          completionDraft: state.completionDraft
            ? {
                ...state.completionDraft,
                note,
              }
            : null,
        })),
      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions],
        })),
      addTodo: (text) =>
        set((state) => ({
          todos: [
            {
              id: createId("todo"),
              text: text.trim(),
              createdAt: Date.now(),
              completedAt: null,
            },
            ...state.todos,
          ],
        })),
      toggleTodo: (todoId) =>
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  completedAt: todo.completedAt ? null : Date.now(),
                }
              : todo,
          ),
        })),
      deleteTodo: (todoId) =>
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== todoId),
        })),
      clearCompletedTodos: () =>
        set((state) => ({
          todos: state.todos.filter((todo) => !todo.completedAt),
        })),
      deleteSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== sessionId),
        })),
      clearSessions: () => set({ sessions: [] }),
      resetAllData: () =>
        set({
          hydrated: true,
          ...initialState,
        }),
    }),
    {
      name: "lockedin-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        sessions: state.sessions,
        todos: state.todos,
        activeMode: state.activeMode,
        selectedSubjectId: state.selectedSubjectId,
        quickNote: state.quickNote,
        activeSession: state.activeSession,
        activeBathroomBreak: state.activeBathroomBreak,
        completionDraft: state.completionDraft,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.settings.defaultMode = migrateLegacyMode(state.settings.defaultMode, defaultSettings.defaultMode);
          state.settings.presence.minimumAbsenceSec = migrateMinimumAbsence(state.settings.presence.minimumAbsenceSec);
          state.activeMode = migrateLegacyMode(state.activeMode, state.settings.defaultMode);
          state.sessions = state.sessions.map((session) => ({
            ...session,
            mode: migrateLegacyMode(session.mode, state.settings.defaultMode),
          }));
          state.activeSession = state.activeSession
            ? {
                ...state.activeSession,
                mode: migrateLegacyMode(state.activeSession.mode, state.settings.defaultMode),
              }
            : null;
          state.completionDraft = state.completionDraft
            ? {
                ...state.completionDraft,
                mode: migrateLegacyMode(state.completionDraft.mode, state.settings.defaultMode),
              }
            : null;
          state.setHydrated(true);
        }
      },
    },
  ),
);
