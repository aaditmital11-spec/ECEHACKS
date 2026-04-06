"use client";

import { useEffect, useRef } from "react";
import { playPresenceAlarmPattern, primePresenceAlarmAudio } from "@/lib/presence-alarm";

export function usePresenceAlarm(shouldPlay: boolean) {
  const intervalRef = useRef<number | null>(null);
  const shouldPlayRef = useRef(shouldPlay);

  shouldPlayRef.current = shouldPlay;

  useEffect(() => {
    if (typeof window === "undefined" || !("AudioContext" in window)) {
      return undefined;
    }

    async function primeAudio() {
      const context = await primePresenceAlarmAudio();

      if (shouldPlayRef.current && context) {
        playPresenceAlarmPattern(context);
      }
    }

    const handleUserGesture = () => {
      void primeAudio();
    };

    window.addEventListener("click", handleUserGesture, { passive: true });
    window.addEventListener("pointerdown", handleUserGesture, { passive: true });
    window.addEventListener("touchstart", handleUserGesture, { passive: true });
    window.addEventListener("keydown", handleUserGesture);

    return () => {
      window.removeEventListener("click", handleUserGesture);
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("touchstart", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
    };
  }, []);

  useEffect(() => {
    async function startAlarmLoop() {
      const context = await primePresenceAlarmAudio();

      if (!context) {
        return;
      }

      playPresenceAlarmPattern(context);

      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }

      intervalRef.current = window.setInterval(() => {
        void (async () => {
          const ctx = await primePresenceAlarmAudio();
          if (ctx?.state === "running") {
            playPresenceAlarmPattern(ctx);
          }
        })();
      }, 650);
    }

    if (shouldPlay) {
      void startAlarmLoop();
      return () => {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return undefined;
  }, [shouldPlay]);
}
