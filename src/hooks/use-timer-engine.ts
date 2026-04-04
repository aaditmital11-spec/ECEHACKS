"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { subjects } from "@/lib/constants";
import {
  createCompletionDraft,
  createSessionRecord,
  createTimerSession,
  getElapsedMs,
  getPomodoroDurationMs,
  getRemainingMs,
  getUpcomingPomodoroPhase,
  shouldTrackPomodoroSession,
} from "@/lib/timer";
import { clamp } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { ActiveTimerSession, PomodoroPhase, TimerMode } from "@/types/app";

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
        session.mode === "pomodoro" && session.pomodoroPhase !== "focus"
          ? "Break finished. Ready for the next focus block."
          : `${getSubjectLabel(session.subjectId)} session finished.`;
      await notifyCompletion(body);
    }

    if (session.mode === "pomodoro" && session.pomodoroPhase !== "focus") {
      const upcoming = getUpcomingPomodoroPhase(session, settings);
      setActiveSession(
        createTimerSession({
          mode: "pomodoro",
          subjectId: session.subjectId,
          note: session.note,
          plannedDurationMs: getPomodoroDurationMs(settings, upcoming.phase),
          pomodoroPhase: upcoming.phase,
          pomodoroCycle: upcoming.cycle,
          startImmediately: upcoming.autoStart,
        }),
      );
      return;
    }

    if (session.mode === "pomodoro" && shouldTrackPomodoroSession(session)) {
      const upcoming = getUpcomingPomodoroPhase(session, settings);
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
          mode: "pomodoro",
          subjectId: session.subjectId,
          note: session.note,
          plannedDurationMs: getPomodoroDurationMs(settings, upcoming.phase),
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

    if (mode === "pomodoro") {
      plannedDurationMs = getPomodoroDurationMs(settings, options?.phase ?? "focus");
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

    if (activeSession.mode === "pomodoro" && activeSession.pomodoroPhase !== "focus") {
      startSession("pomodoro", {
        phase: "focus",
        autoStart: false,
        subjectId: activeSession.subjectId,
        note: activeSession.note,
      });
      return;
    }

    startSession(activeSession.mode, {
      phase: activeSession.mode === "pomodoro" ? activeSession.pomodoroPhase : undefined,
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

    if (activeSession.mode === "pomodoro" && activeSession.pomodoroPhase !== "focus") {
      startSession("pomodoro", {
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

  function skipBreak() {
    if (!activeSession || activeSession.mode !== "pomodoro" || activeSession.pomodoroPhase === "focus") {
      return;
    }

    startSession("pomodoro", {
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

    const resolvedStatus = status ?? (completionDraft.completedAsPlanned ? "completed" : "interrupted");

    addSession(
      createSessionRecord({
        completion: completionDraft,
        subjectLabel: getSubjectLabel(completionDraft.subjectId),
        status: resolvedStatus,
      }),
    );
    setQuickNote("");
    setCompletionDraft(null);
  }

  function saveAndStartAnother() {
    if (!completionDraft) {
      return;
    }

    const { mode, subjectId, note } = completionDraft;
    saveCompletion();
    startSession(mode, { subjectId, note });
  }

  function saveAndStartBreak() {
    if (!completionDraft) {
      saveCompletion();
      return;
    }

    saveCompletion();

    if (activeSession?.mode === "pomodoro" && activeSession.pomodoroPhase !== "focus" && !activeSession.isRunning) {
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
    skipBreak,
    saveCompletion,
    saveAndStartAnother,
    saveAndStartBreak,
    dismissCompletion,
    updateCompletionNote,
  };
}
