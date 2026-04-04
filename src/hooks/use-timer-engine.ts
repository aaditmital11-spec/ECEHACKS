"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { isStudyMode, subjects } from "@/lib/constants";
import {
  createCompletionDraft,
  createSessionRecord,
  createTimerSession,
  getElapsedMs,
  getStudyDurationMs,
  getRemainingMs,
  getUpcomingStudyPhase,
  shouldTrackStudySession,
} from "@/lib/timer";
import { clamp } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { ActiveTimerSession, CompletionDraft, PomodoroPhase, TimerMode } from "@/types/app";

function playCompletionSound() {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return;
  }

  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 784;
  gainNode.gain.value = 0.05;
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
}

async function notifyCompletion(body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    new Notification("Session complete", { body });
    return;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("Session complete", { body });
    }
  }
}

function getSubjectLabel(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId)?.label ?? "Custom";
}

function saveDraftAsSession(
  addSession: (session: ReturnType<typeof createSessionRecord>) => void,
  draft: CompletionDraft,
  status?: "completed" | "interrupted",
) {
  const resolvedStatus = status ?? (draft.completedAsPlanned ? "completed" : "interrupted");

  addSession(
    createSessionRecord({
      completion: draft,
      subjectLabel: getSubjectLabel(draft.subjectId),
      status: resolvedStatus,
    }),
  );
}

function normalizeCompletionStatus(value?: unknown): "completed" | "interrupted" | undefined {
  if (value === "completed" || value === "interrupted") {
    return value;
  }

  return undefined;
}

export function useTimerEngine() {
  const settings = useAppStore((state) => state.settings);
  const activeMode = useAppStore((state) => state.activeMode);
  const selectedSubjectId = useAppStore((state) => state.selectedSubjectId);
  const quickNote = useAppStore((state) => state.quickNote);
  const activeSession = useAppStore((state) => state.activeSession);
  const completionDraft = useAppStore((state) => state.completionDraft);
  const setActiveSession = useAppStore((state) => state.setActiveSession);
  const patchActiveSession = useAppStore((state) => state.patchActiveSession);
  const setCompletionDraft = useAppStore((state) => state.setCompletionDraft);
  const addSession = useAppStore((state) => state.addSession);
  const updateCompletionNote = useAppStore((state) => state.updateCompletionNote);
  const setQuickNote = useAppStore((state) => state.setQuickNote);
  const [now, setNow] = useState(0);
  const completionLock = useRef<string | null>(null);

  const handleTimedCompletion = useEffectEvent(async (session: ActiveTimerSession) => {
    const endedAt = Date.now();
    const actualDurationMs = session.plannedDurationMs ?? getElapsedMs(session, endedAt);

    if (settings.soundEnabled) {
      playCompletionSound();
    }

    if (settings.notificationsEnabled) {
      const body =
        isStudyMode(session.mode) && session.pomodoroPhase !== "focus"
          ? "Break finished. Ready for the next focus block."
          : `${getSubjectLabel(session.subjectId)} session finished.`;
      await notifyCompletion(body);
    }

    if (isStudyMode(session.mode) && session.pomodoroPhase !== "focus") {
      const upcoming = getUpcomingStudyPhase(session, settings);
      setActiveSession(
        createTimerSession({
          mode: session.mode,
          subjectId: session.subjectId,
          note: session.note,
          plannedDurationMs: getStudyDurationMs(session.mode, settings, upcoming.phase),
          pomodoroPhase: upcoming.phase,
          pomodoroCycle: upcoming.cycle,
          startImmediately: upcoming.autoStart,
        }),
      );
      return;
    }

    if (isStudyMode(session.mode) && shouldTrackStudySession(session)) {
      const upcoming = getUpcomingStudyPhase(session, settings);
      setCompletionDraft(
        createCompletionDraft({
          session,
          actualDurationMs,
          completedAsPlanned: true,
          endedAt,
        }),
      );

      setActiveSession(
        createTimerSession({
          mode: session.mode,
          subjectId: session.subjectId,
          note: session.note,
          plannedDurationMs: getStudyDurationMs(session.mode, settings, upcoming.phase),
          pomodoroPhase: upcoming.phase,
          pomodoroCycle: upcoming.cycle,
          startImmediately: upcoming.autoStart,
        }),
      );
      return;
    }

    setCompletionDraft(
      createCompletionDraft({
        session,
        actualDurationMs,
        completedAsPlanned: true,
        endedAt,
      }),
    );
    setActiveSession(null);
  });

  useEffect(() => {
    if (!activeSession?.isRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSession?.id, activeSession?.isRunning]);

  const elapsedMs = useMemo(
    () => (activeSession ? getElapsedMs(activeSession, now) : 0),
    [activeSession, now],
  );
  const remainingMs = useMemo(
    () => (activeSession ? getRemainingMs(activeSession, now) : 0),
    [activeSession, now],
  );

  const progress = useMemo(() => {
    if (!activeSession?.plannedDurationMs) {
      return 0;
    }

    return clamp(elapsedMs / activeSession.plannedDurationMs, 0, 1);
  }, [activeSession, elapsedMs]);

  useEffect(() => {
    if (!activeSession?.isRunning || !activeSession.plannedDurationMs) {
      completionLock.current = null;
      return;
    }

    if (remainingMs > 0 || completionLock.current === activeSession.id) {
      return;
    }

    completionLock.current = activeSession.id;
    handleTimedCompletion(activeSession);
  }, [activeSession, remainingMs]);

  function startSession(
    mode: TimerMode = activeMode,
    options?: { phase?: PomodoroPhase; autoStart?: boolean; subjectId?: string; note?: string },
  ) {
    const subjectId = options?.subjectId ?? selectedSubjectId;
    const note = options?.note ?? quickNote;
    let plannedDurationMs: number | undefined;

    if (isStudyMode(mode)) {
      plannedDurationMs = getStudyDurationMs(mode, settings, options?.phase ?? "focus");
    }

    if (mode === "countdown") {
      plannedDurationMs = settings.timerDefaults.countdown.durationMin * 60000;
    }

    if (mode === "deep-focus") {
      plannedDurationMs = settings.timerDefaults.deepFocusDurationMin * 60000;
    }

    setActiveSession(
      createTimerSession({
        mode,
        subjectId,
        note,
        plannedDurationMs,
        pomodoroPhase: options?.phase ?? "focus",
        startImmediately: options?.autoStart ?? true,
      }),
    );
    setCompletionDraft(null);
  }

  function pauseSession() {
    if (!activeSession?.isRunning) {
      return;
    }

    const pausedAt = Date.now();
    patchActiveSession({
      isRunning: false,
      pausedAt,
      accumulatedMs: getElapsedMs(activeSession, pausedAt),
      lastResumedAt: null,
    });
  }

  function resumeSession() {
    if (!activeSession || activeSession.isRunning) {
      return;
    }

    const resumedAt = Date.now();
    patchActiveSession({
      isRunning: true,
      pausedAt: null,
      lastResumedAt: resumedAt,
    });
  }

  function resetSession() {
    if (!activeSession) {
      return;
    }

    if (isStudyMode(activeSession.mode) && activeSession.pomodoroPhase !== "focus") {
      startSession(activeSession.mode, {
        phase: "focus",
        autoStart: false,
        subjectId: activeSession.subjectId,
        note: activeSession.note,
      });
      return;
    }

    startSession(activeSession.mode, {
      phase: isStudyMode(activeSession.mode) ? activeSession.pomodoroPhase : undefined,
      autoStart: false,
      subjectId: activeSession.subjectId,
      note: activeSession.note,
    });
  }

  function stopSession() {
    if (!activeSession) {
      return;
    }

    const stoppedAt = Date.now();
    const actualDurationMs = getElapsedMs(activeSession, stoppedAt);

    if (actualDurationMs < 1000) {
      setActiveSession(null);
      return;
    }

    if (isStudyMode(activeSession.mode) && activeSession.pomodoroPhase !== "focus") {
      startSession(activeSession.mode, {
        phase: "focus",
        autoStart: false,
        subjectId: activeSession.subjectId,
        note: activeSession.note,
      });
      return;
    }

    setCompletionDraft(
      createCompletionDraft({
        session: activeSession,
        actualDurationMs,
        completedAsPlanned: false,
        endedAt: stoppedAt,
      }),
    );
    setActiveSession(null);
  }

  function failSession() {
    if (!activeSession) {
      return;
    }

    const interruptedAt = Date.now();
    const actualDurationMs = getElapsedMs(activeSession, interruptedAt);

    if (actualDurationMs >= 1000 && shouldTrackStudySession(activeSession)) {
      addSession(
        createSessionRecord({
          completion: createCompletionDraft({
            session: activeSession,
            actualDurationMs,
            completedAsPlanned: false,
            endedAt: interruptedAt,
          }),
          subjectLabel: getSubjectLabel(activeSession.subjectId),
          status: "interrupted",
        }),
      );
    }

    setCompletionDraft(null);
    setActiveSession(null);
  }

  function skipBreak() {
    if (!activeSession || !isStudyMode(activeSession.mode) || activeSession.pomodoroPhase === "focus") {
      return;
    }

    startSession(activeSession.mode, {
      phase: "focus",
      autoStart: false,
      subjectId: activeSession.subjectId,
      note: activeSession.note,
    });
  }

  function saveCompletion(status?: "completed" | "interrupted") {
    if (!completionDraft) {
      return;
    }

    saveDraftAsSession(addSession, completionDraft, normalizeCompletionStatus(status));
    setQuickNote("");
    setCompletionDraft(null);
  }

  function saveAndStartAnother() {
    if (!completionDraft) {
      return;
    }

    const draft = completionDraft;
    const { mode, subjectId, note } = draft;

    saveDraftAsSession(addSession, draft);
    setCompletionDraft(null);
    startSession(mode, { subjectId, note });
  }

  function saveAndStartBreak() {
    if (!completionDraft) {
      saveCompletion();
      return;
    }

    saveCompletion();

    if (activeSession && isStudyMode(activeSession.mode) && activeSession.pomodoroPhase !== "focus" && !activeSession.isRunning) {
      resumeSession();
    }
  }

  function dismissCompletion() {
    setCompletionDraft(null);
  }

  return {
    activeMode,
    activeSession,
    completionDraft,
    elapsedMs,
    remainingMs,
    progress,
    displayMs: activeSession?.mode === "stopwatch" ? elapsedMs : remainingMs,
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
    stopSession,
    failSession,
    skipBreak,
    saveCompletion,
    saveAndStartAnother,
    saveAndStartBreak,
    dismissCompletion,
    updateCompletionNote,
  };
}
