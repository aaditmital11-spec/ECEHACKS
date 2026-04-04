import type { AppSettings, SubjectOption, TimerMode } from "@/types/app";

export const appName = "lockedIn.";

export const subjects: SubjectOption[] = [
  { id: "math", label: "Math", color: "rgba(255, 121, 82, 0.16)", textColor: "#ffe2d7" },
  { id: "physics", label: "Physics", color: "rgba(255, 102, 71, 0.15)", textColor: "#ffd8d0" },
  { id: "coding", label: "Coding", color: "rgba(255, 147, 92, 0.16)", textColor: "#ffe7d6" },
  { id: "reading", label: "Reading", color: "rgba(219, 89, 65, 0.15)", textColor: "#ffd9d0" },
  { id: "writing", label: "Writing", color: "rgba(255, 168, 120, 0.15)", textColor: "#fff0e2" },
  { id: "custom", label: "Custom", color: "rgba(214, 109, 84, 0.14)", textColor: "#ffe1d8" },
];

export const modeMeta: Record<
  TimerMode,
  { label: string; description: string; accent: string; compactDescription: string }
> = {
  pomodoro: {
    label: "Pomodoro",
    description: "Structured focus and break cycles for consistent study blocks.",
    compactDescription: "Guided focus cycles",
    accent: "#ff7a52",
  },
  countdown: {
    label: "Countdown",
    description: "Set a target duration and work toward a defined finish.",
    compactDescription: "Fixed-duration sessions",
    accent: "#ff9560",
  },
  stopwatch: {
    label: "Stopwatch",
    description: "Track open-ended work without preset limits.",
    compactDescription: "Open-ended tracking",
    accent: "#ff8b63",
  },
  "deep-focus": {
    label: "Deep Focus",
    description: "A quieter, stripped-down timer for uninterrupted concentration.",
    compactDescription: "Immersive focus mode",
    accent: "#db5d46",
  },
};

export const navItems = [
  { href: "/app", label: "Overview" },
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/history", label: "History" },
  { href: "/app/settings", label: "Settings" },
];

export const defaultSettings: AppSettings = {
  theme: "graphite",
  defaultMode: "pomodoro",
  soundEnabled: true,
  notificationsEnabled: false,
  reduceMotion: false,
  bathroomBreakDurationSec: 120,
  absenceAlertThresholdSec: 90,
  timerDefaults: {
    pomodoro: {
      focusDurationMin: 45,
      shortBreakDurationMin: 10,
      longBreakDurationMin: 20,
      cyclesBeforeLongBreak: 4,
      autoStartNextPhase: false,
      autoStartBreak: false,
    },
    countdown: {
      durationMin: 60,
    },
    deepFocusDurationMin: 90,
  },
};

export const studyPresets = [
  { id: "chill", label: "Chill", focusMin: 30, breakMin: 30 },
  { id: "regular", label: "Regular", focusMin: 60, breakMin: 30 },
  { id: "exams", label: "Exams", focusMin: 120, breakMin: 20 },
] as const;

export const focusQuotes = [
  "A deliberate session beats a distracted hour.",
  "Keep the work in view and the noise out of frame.",
  "Structure makes deep work easier to return to.",
];
