"use client";

function createBeep(context: AudioContext, startAt: number, frequency: number) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.12, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.2);
}

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return null;
  }

  if (!audioContext) {
    audioContext = new window.AudioContext();
  }

  return audioContext;
}

export async function primePresenceAlarmAudio() {
  const context = getAudioContext();

  if (!context) {
    return null;
  }

  if (context.state !== "running") {
    try {
      await context.resume();
    } catch {
      return null;
    }
  }

  return context.state === "running" ? context : null;
}

export function playPresenceAlarmPattern(context: AudioContext) {
  const now = context.currentTime;
  createBeep(context, now, 880);
  createBeep(context, now + 0.18, 740);
  createBeep(context, now + 0.36, 988);
}

export async function previewPresenceAlarm() {
  const context = await primePresenceAlarmAudio();

  if (!context) {
    return false;
  }

  playPresenceAlarmPattern(context);
  return true;
}
