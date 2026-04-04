"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { useAppStore } from "@/store/app-store";
import { formatSecondsLabel } from "@/lib/time";
import { createId } from "@/lib/utils";

function playReminderSound() {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return;
  }

  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = 659;
  gainNode.gain.value = 0.05;
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.2);
}

async function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification(title, { body });
    }
  }
}

export function useBathroomBreak() {
  const settings = useAppStore((state) => state.settings);
  const activeBathroomBreak = useAppStore((state) => state.activeBathroomBreak);
  const setActiveBathroomBreak = useAppStore((state) => state.setActiveBathroomBreak);
  const patchActiveBathroomBreak = useAppStore((state) => state.patchActiveBathroomBreak);
  const [now, setNow] = useState(0);
  const completionLock = useRef<string | null>(null);

  const handleBreakComplete = useEffectEvent(async () => {
    if (!activeBathroomBreak) {
      return;
    }

    if (settings.soundEnabled) {
      playReminderSound();
    }

    if (settings.notificationsEnabled) {
      await notify("Bathroom break complete", "Time to get back to work.");
    }

    setActiveBathroomBreak(null);
  });

  const handleAbsenceThreshold = useEffectEvent(async () => {
    if (!activeBathroomBreak || activeBathroomBreak.alertedAt) {
      return;
    }

    if (settings.soundEnabled) {
      playReminderSound();
    }

    if (settings.notificationsEnabled) {
      await notify(
        "Away too long",
        `You have been away for ${formatSecondsLabel(settings.absenceAlertThresholdSec)}.`,
      );
    }

    patchActiveBathroomBreak({ alertedAt: Date.now() });
  });

  useEffect(() => {
    if (!activeBathroomBreak) {
      completionLock.current = null;
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeBathroomBreak]);

  const remainingMs = useMemo(() => {
    if (!activeBathroomBreak) {
      return 0;
    }

    return Math.max(0, activeBathroomBreak.endsAt - now);
  }, [activeBathroomBreak, now]);

  const awayForMs = useMemo(() => {
    if (!activeBathroomBreak) {
      return 0;
    }

    return Math.max(0, now - activeBathroomBreak.startedAt);
  }, [activeBathroomBreak, now]);

  useEffect(() => {
    if (!activeBathroomBreak) {
      return;
    }

    if (awayForMs >= settings.absenceAlertThresholdSec * 1000 && !activeBathroomBreak.alertedAt) {
      handleAbsenceThreshold();
    }

    if (remainingMs > 0 || completionLock.current === activeBathroomBreak.id) {
      return;
    }

    completionLock.current = activeBathroomBreak.id;
    handleBreakComplete();
  }, [activeBathroomBreak, awayForMs, remainingMs, settings.absenceAlertThresholdSec]);

  function startBathroomBreak() {
    const startedAt = Date.now();
    setActiveBathroomBreak({
      id: createId("bathroom-break"),
      startedAt,
      endsAt: startedAt + settings.bathroomBreakDurationSec * 1000,
      alertedAt: null,
    });
  }

  function cancelBathroomBreak() {
    setActiveBathroomBreak(null);
  }

  return {
    activeBathroomBreak,
    remainingMs,
    awayForMs,
    startBathroomBreak,
    cancelBathroomBreak,
  };
}
