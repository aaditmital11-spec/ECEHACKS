"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { presenceStatusUrl } from "@/lib/presence";
import {
  createCompletionDraft,
  createSessionRecord,
  getElapsedMs,
  isPresenceSensitiveSession,
} from "@/lib/timer";
import { subjects } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import type { PresenceServiceSnapshot } from "@/types/app";

import { usePresenceAlarm } from "./use-presence-alarm";

function getSubjectLabel(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId)?.label ?? "Custom";
}

export function usePresenceMonitor() {
  const settings = useAppStore((state) => state.settings);
  const activeSession = useAppStore((state) => state.activeSession);
  const presenceRuntime = useAppStore((state) => state.presenceRuntime);
  const patchActiveSession = useAppStore((state) => state.patchActiveSession);
  const setActiveSession = useAppStore((state) => state.setActiveSession);
  const addSession = useAppStore((state) => state.addSession);
  const setCompletionDraft = useAppStore((state) => state.setCompletionDraft);
  const patchPresenceRuntime = useAppStore((state) => state.patchPresenceRuntime);
  const useAppStoreRef = useRef(useAppStore);
  const presencePausedSessionIdRef = useRef<string | null>(null);

  usePresenceAlarm(presenceRuntime.isAlarmPlaying && settings.presence.alarmEnabled);

  const syncPresenceDurations = useEffectEvent(() => {
    const state = useAppStoreRef.current.getState();
    const runtime = state.presenceRuntime;
    const now = Date.now();

    const absentDurationMs =
      runtime.isPresent || runtime.lastPresentAt === null ? 0 : Math.max(0, now - runtime.lastPresentAt);
    const recoveryTimeRemainingMs = runtime.recoveryDeadlineAt ? Math.max(0, runtime.recoveryDeadlineAt - now) : 0;

    patchPresenceRuntime({
      absentDurationMs,
      recoveryTimeRemainingMs,
    });
  });

  const handleRecoveryReset = useEffectEvent((awaitingManualResume = false) => {
    patchPresenceRuntime({
      hasTriggeredAbsenceEvent: false,
      isRecoveryCountdownActive: false,
      recoveryStartedAt: null,
      recoveryDeadlineAt: null,
      recoveryTimeRemainingMs: 0,
      isAlarmPlaying: false,
      awaitingManualResume,
    });
  });

  const pauseForPresence = useEffectEvent(() => {
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
    presencePausedSessionIdRef.current = activeSession.id;
  });

  const resumeAfterPresence = useEffectEvent(() => {
    if (!activeSession || activeSession.isRunning || presencePausedSessionIdRef.current !== activeSession.id) {
      return;
    }

    if (settings.presence.autoResume) {
      const resumedAt = Date.now();
      patchActiveSession({
        isRunning: true,
        pausedAt: null,
        lastResumedAt: resumedAt,
      });
      presencePausedSessionIdRef.current = null;
      handleRecoveryReset(false);
      return;
    }

    handleRecoveryReset(true);
  });

  const failSessionForExtendedAbsence = useEffectEvent(() => {
    if (!activeSession) {
      return;
    }

    const interruptedAt = Date.now();
    const actualDurationMs = getElapsedMs(activeSession, interruptedAt);

    if (actualDurationMs >= 1000 && isPresenceSensitiveSession(activeSession)) {
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
    presencePausedSessionIdRef.current = null;
    patchPresenceRuntime({
      hasTriggeredAbsenceEvent: false,
      isRecoveryCountdownActive: false,
      recoveryStartedAt: null,
      recoveryDeadlineAt: null,
      recoveryTimeRemainingMs: 0,
      isAlarmPlaying: false,
      awaitingManualResume: false,
      sessionFailureReason: "extended-absence",
    });
  });

  const applyPresenceSnapshot = useEffectEvent((snapshot: PresenceServiceSnapshot) => {
    patchPresenceRuntime({
      isPresent: snapshot.present,
      lastPresentAt: snapshot.lastSeenTimestamp,
      absentDurationMs: snapshot.absentDurationMs,
      confidence: snapshot.confidence,
      serviceStatus: snapshot.serviceStatus,
      cameraStatus: snapshot.cameraStatus,
      serviceError: snapshot.error,
      previewAvailable: snapshot.previewAvailable,
      lastServiceUpdateAt: snapshot.updatedAt,
    });
  });

  const markServiceUnavailable = useEffectEvent((error: string) => {
    patchPresenceRuntime({
      serviceStatus: "offline",
      cameraStatus: "offline",
      serviceError: error,
      previewAvailable: false,
      isAlarmPlaying: false,
    });
  });

  useEffect(() => {
    let cancelled = false;

    async function pollStatus() {
      try {
        const response = await fetch(presenceStatusUrl, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Presence service returned ${response.status}.`);
        }

        const snapshot = (await response.json()) as PresenceServiceSnapshot;
        if (cancelled) {
          return;
        }

        applyPresenceSnapshot(snapshot);
      } catch (error) {
        if (cancelled) {
          return;
        }

        markServiceUnavailable(
          error instanceof Error ? error.message : "Unable to reach the local presence service.",
        );
      }
    }

    void pollStatus();
    const intervalId = window.setInterval(pollStatus, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    syncPresenceDurations();
    const intervalId = window.setInterval(syncPresenceDurations, 250);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!activeSession) {
      presencePausedSessionIdRef.current = null;
      handleRecoveryReset(false);
      return;
    }

    patchPresenceRuntime({ sessionFailureReason: null });
  }, [activeSession, patchPresenceRuntime]);

  useEffect(() => {
    if (!activeSession?.isRunning && activeSession && presencePausedSessionIdRef.current === activeSession.id) {
      return;
    }

    if (activeSession?.isRunning && presencePausedSessionIdRef.current === activeSession.id) {
      presencePausedSessionIdRef.current = null;
      patchPresenceRuntime({
        awaitingManualResume: false,
        hasTriggeredAbsenceEvent: false,
        sessionFailureReason: null,
      });
    }
  }, [activeSession, patchPresenceRuntime]);

  useEffect(() => {
    const isMonitoringReady =
      settings.presence.enabled &&
      presenceRuntime.serviceStatus === "ready" &&
      presenceRuntime.cameraStatus === "streaming";

    if (!isMonitoringReady) {
      if (presenceRuntime.isRecoveryCountdownActive) {
        handleRecoveryReset(Boolean(presencePausedSessionIdRef.current));
      }
      return;
    }

    if (!activeSession || !isPresenceSensitiveSession(activeSession)) {
      if (presenceRuntime.isRecoveryCountdownActive) {
        handleRecoveryReset(false);
      }
      return;
    }

    if (presenceRuntime.isPresent) {
      if (presenceRuntime.isRecoveryCountdownActive) {
        resumeAfterPresence();
      }
      return;
    }

    if (!activeSession.isRunning) {
      return;
    }

    const absenceThresholdReached =
      presenceRuntime.absentDurationMs >= settings.presence.minimumAbsenceSec * 1000;

    if (absenceThresholdReached && settings.presence.alarmEnabled && !presenceRuntime.isAlarmPlaying) {
      patchPresenceRuntime({ isAlarmPlaying: true });
    }

    if (
      !absenceThresholdReached ||
      presenceRuntime.hasTriggeredAbsenceEvent
    ) {
      return;
    }

    const recoveryStartedAt = Date.now();
    pauseForPresence();
    patchPresenceRuntime({
      hasTriggeredAbsenceEvent: true,
      isRecoveryCountdownActive: true,
      recoveryStartedAt,
      recoveryDeadlineAt: recoveryStartedAt + settings.presence.recoveryDurationSec * 1000,
      recoveryTimeRemainingMs: settings.presence.recoveryDurationSec * 1000,
      isAlarmPlaying: settings.presence.alarmEnabled,
      awaitingManualResume: false,
      sessionFailureReason: null,
    });
  }, [
    activeSession,
    patchPresenceRuntime,
    presenceRuntime.absentDurationMs,
    presenceRuntime.cameraStatus,
    presenceRuntime.hasTriggeredAbsenceEvent,
    presenceRuntime.isPresent,
    presenceRuntime.isRecoveryCountdownActive,
    presenceRuntime.serviceStatus,
    settings.presence.alarmEnabled,
    settings.presence.enabled,
    settings.presence.minimumAbsenceSec,
    settings.presence.recoveryDurationSec,
  ]);

  useEffect(() => {
    if (!presenceRuntime.isRecoveryCountdownActive || presenceRuntime.recoveryTimeRemainingMs > 0) {
      return;
    }

    failSessionForExtendedAbsence();
  }, [presenceRuntime.isRecoveryCountdownActive, presenceRuntime.recoveryTimeRemainingMs]);
}
