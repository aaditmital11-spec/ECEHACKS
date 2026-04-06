"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { normalizePresenceSnapshot, presenceStatusUrl } from "@/lib/presence";
import {
  createCompletionDraft,
  createSessionRecord,
  getElapsedMs,
  isPresenceSensitiveSession,
} from "@/lib/timer";
import { defaultSettings, subjects } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import type { PresenceRuntimeState, PresenceServiceSnapshot } from "@/types/app";

import { usePresenceAlarm } from "./use-presence-alarm";

function getSubjectLabel(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId)?.label ?? "Custom";
}

export function usePresenceMonitor() {
  const settings = useAppStore((state) => state.settings);
  const presence = settings.presence ?? defaultSettings.presence;
  const activeSession = useAppStore((state) => state.activeSession);
  const presenceRuntime = useAppStore((state) => state.presenceRuntime);
  const patchActiveSession = useAppStore((state) => state.patchActiveSession);
  const setActiveSession = useAppStore((state) => state.setActiveSession);
  const addSession = useAppStore((state) => state.addSession);
  const setCompletionDraft = useAppStore((state) => state.setCompletionDraft);
  const patchPresenceRuntime = useAppStore((state) => state.patchPresenceRuntime);
  const useAppStoreRef = useRef(useAppStore);
  const presencePausedSessionIdRef = useRef<string | null>(null);

  usePresenceAlarm(presenceRuntime.isAlarmPlaying && presence.alarmEnabled);

  const syncPresenceDurations = useEffectEvent(() => {
    const state = useAppStoreRef.current.getState();
    const runtime = state.presenceRuntime;
    const presenceSettings = state.settings.presence ?? defaultSettings.presence;
    const now = Date.now();

    const fromLastSeen =
      runtime.isPresent || runtime.lastPresentAt === null ? 0 : Math.max(0, now - runtime.lastPresentAt);
    const absentDurationMs = runtime.isPresent
      ? 0
      : Math.max(fromLastSeen, runtime.absentDurationMs);
    const recoveryTimeRemainingMs = runtime.recoveryDeadlineAt ? Math.max(0, runtime.recoveryDeadlineAt - now) : 0;

    const patches: Partial<PresenceRuntimeState> = {
      absentDurationMs,
      recoveryTimeRemainingMs,
    };

    let alarmStartedAt = runtime.alarmStartedAt;
    if (runtime.isAlarmPlaying && presenceSettings.alarmEnabled && alarmStartedAt === null) {
      alarmStartedAt = now;
      patches.alarmStartedAt = now;
    }

    // Alarm: repeat beeps until back in frame OR alarmDurationSec elapses (default 10s).
    if (runtime.isAlarmPlaying) {
      if (runtime.isPresent || !presenceSettings.alarmEnabled) {
        patches.isAlarmPlaying = false;
        patches.alarmStartedAt = null;
      } else if (alarmStartedAt !== null) {
        const alarmElapsedMs = now - alarmStartedAt;
        if (alarmElapsedMs >= presenceSettings.alarmDurationSec * 1000) {
          patches.isAlarmPlaying = false;
          patches.alarmStartedAt = null;
        }
      }
    }

    patchPresenceRuntime(patches);
  });

  const handleRecoveryReset = useEffectEvent((awaitingManualResume = false) => {
    patchPresenceRuntime({
      hasTriggeredAbsenceEvent: false,
      isRecoveryCountdownActive: false,
      recoveryStartedAt: null,
      recoveryDeadlineAt: null,
      recoveryTimeRemainingMs: 0,
      isAlarmPlaying: false,
      alarmStartedAt: null,
      awaitingManualResume,
    });
  });

  const pauseForPresence = useEffectEvent(() => {
    const session = useAppStoreRef.current.getState().activeSession;
    if (!session?.isRunning) {
      return;
    }

    const pausedAt = Date.now();
    patchActiveSession({
      isRunning: false,
      pausedAt,
      accumulatedMs: getElapsedMs(session, pausedAt),
      lastResumedAt: null,
    });
    presencePausedSessionIdRef.current = session.id;
  });

  const resumeAfterPresence = useEffectEvent(() => {
    const state = useAppStoreRef.current.getState();
    const session = state.activeSession;
    const presenceSettings = state.settings.presence ?? defaultSettings.presence;

    if (!session || session.isRunning || presencePausedSessionIdRef.current !== session.id) {
      return;
    }

    if (presenceSettings.autoResume) {
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
    const session = useAppStoreRef.current.getState().activeSession;
    if (!session) {
      return;
    }

    const interruptedAt = Date.now();
    const actualDurationMs = getElapsedMs(session, interruptedAt);

    if (actualDurationMs >= 1000 && isPresenceSensitiveSession(session)) {
      addSession(
        createSessionRecord({
          completion: createCompletionDraft({
            session,
            actualDurationMs,
            completedAsPlanned: false,
            endedAt: interruptedAt,
          }),
          subjectLabel: getSubjectLabel(session.subjectId),
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
      alarmStartedAt: null,
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
      alarmStartedAt: null,
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

        const snapshot = normalizePresenceSnapshot((await response.json()) as PresenceServiceSnapshot);
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
      presence.enabled &&
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
      presenceRuntime.absentDurationMs >= presence.minimumAbsenceSec * 1000;

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
      recoveryDeadlineAt: recoveryStartedAt + presence.recoveryDurationSec * 1000,
      recoveryTimeRemainingMs: presence.recoveryDurationSec * 1000,
      isAlarmPlaying: presence.alarmEnabled,
      alarmStartedAt: presence.alarmEnabled ? recoveryStartedAt : null,
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
    presence.alarmEnabled,
    presence.autoResume,
    presence.enabled,
    presence.minimumAbsenceSec,
    presence.recoveryDurationSec,
    presence.alarmDurationSec,
  ]);

  useEffect(() => {
    if (!presenceRuntime.isRecoveryCountdownActive || presenceRuntime.recoveryTimeRemainingMs > 0) {
      return;
    }

    failSessionForExtendedAbsence();
  }, [presenceRuntime.isRecoveryCountdownActive, presenceRuntime.recoveryTimeRemainingMs]);
}
