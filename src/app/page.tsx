"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type SessionState = {
  active: boolean;
  mode: "chill" | "regular" | "exams" | "custom";
  phase: "study" | "break";
  manual_paused: boolean;
  bathroom_break_active: boolean;
  bathroom_seconds_left: number;
  phase_remaining_seconds: number;
  total_active_seconds: number;
  max_session_seconds: number;
  started_at: string | null;
  ended_reason: string | null;
};

type BackendStatus = {
  running: boolean;
  present: boolean;
  alert_active: boolean;
  time_present: string | null;
  absence_started_at: string | null;
  seconds_until_alert: number;
  last_check_at: string | null;
  last_error: string | null;
  config: {
    poll_interval_seconds: number;
    absence_timeout_seconds: number;
    study_duration_seconds: number;
    break_duration_seconds: number;
    bathroom_break_seconds: number;
  };
  session?: SessionState;
};

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

const MODE_PRESETS = {
  chill: { study: 30 * 60, break: 30 * 60 },
  regular: { study: 60 * 60, break: 30 * 60 },
  exams: { study: 120 * 60, break: 20 * 60 },
} as const;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":");
}

function secondsToMinutesString(seconds: number) {
  return (seconds / 60).toFixed(0);
}

export default function StudyTimerPage() {
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configInitialized, setConfigInitialized] = useState(false);

  const [studySeconds, setStudySeconds] = useState(60 * 60);
  const [breakSeconds, setBreakSeconds] = useState(30 * 60);
  const [absenceSeconds, setAbsenceSeconds] = useState(30);
  const [bathroomSeconds, setBathroomSeconds] = useState(5 * 60);

  const [selectedMode, setSelectedMode] = useState<"chill" | "regular" | "exams" | "custom">("regular");

  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoInput, setTodoInput] = useState("");

  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const previousPhaseRef = useRef<SessionState["phase"] | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchJson<BackendStatus>("/status");
      setStatus(data);
      setError(null);

      if (!configInitialized) {
        setStudySeconds(data.config.study_duration_seconds);
        setBreakSeconds(data.config.break_duration_seconds);
        setAbsenceSeconds(data.config.absence_timeout_seconds);
        setBathroomSeconds(data.config.bathroom_break_seconds);
        setConfigInitialized(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach backend");
    } finally {
      setLoading(false);
    }
  }, [configInitialized]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 1000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  useEffect(() => {
    const currentAlert = Boolean(status?.alert_active);

    if (!alarmRef.current) {
      return;
    }

    if (alarmEnabled && currentAlert) {
      if (alarmRef.current.paused) {
        alarmRef.current.currentTime = 0;
        alarmRef.current.play().catch(() => {
          // Browser may block autoplay if user has not interacted.
        });
      }
      return;
    }

    alarmRef.current.pause();
    alarmRef.current.currentTime = 0;
  }, [alarmEnabled, status?.alert_active]);

  useEffect(() => {
    const phase = status?.session?.phase;
    const active = Boolean(status?.session?.active);

    if (!active || !phase) {
      previousPhaseRef.current = phase ?? null;
      return;
    }

    const previousPhase = previousPhaseRef.current;
    const didPhaseSwitch = previousPhase && previousPhase !== phase;

    if (didPhaseSwitch) {
      try {
        const audioContext = new window.AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.12);

        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.14);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);

        oscillator.onended = () => {
          void audioContext.close();
        };
      } catch {
        // Ignore audio-context errors silently.
      }
    }

    previousPhaseRef.current = phase;
  }, [status?.session?.active, status?.session?.phase]);

  const saveConfig = useCallback(async () => {
    await fetchJson("/config", {
      method: "POST",
      body: JSON.stringify({
        poll_interval_seconds: 1,
        study_duration_seconds: studySeconds,
        break_duration_seconds: breakSeconds,
        absence_timeout_seconds: absenceSeconds,
        bathroom_break_seconds: bathroomSeconds,
      }),
    });
    await loadStatus();
  }, [absenceSeconds, bathroomSeconds, breakSeconds, loadStatus, studySeconds]);

  const applyMode = useCallback(
    async (mode: "chill" | "regular" | "exams") => {
      const preset = MODE_PRESETS[mode];
      setSelectedMode(mode);
      setStudySeconds(preset.study);
      setBreakSeconds(preset.break);

      await fetchJson("/config", {
        method: "POST",
        body: JSON.stringify({
          poll_interval_seconds: 1,
          study_duration_seconds: preset.study,
          break_duration_seconds: preset.break,
          absence_timeout_seconds: absenceSeconds,
          bathroom_break_seconds: bathroomSeconds,
        }),
      });
      await loadStatus();
    },
    [absenceSeconds, bathroomSeconds, loadStatus],
  );

  const startSession = useCallback(async () => {
    await saveConfig();
    await fetchJson("/session/start", {
      method: "POST",
      body: JSON.stringify({ mode: selectedMode }),
    });
    await loadStatus();
  }, [loadStatus, saveConfig, selectedMode]);

  const stopSession = useCallback(async () => {
    await fetchJson("/session/stop", { method: "POST" });
    await loadStatus();
  }, [loadStatus]);

  const pauseSession = useCallback(async () => {
    await fetchJson("/session/pause", { method: "POST" });
    await loadStatus();
  }, [loadStatus]);

  const resumeSession = useCallback(async () => {
    await fetchJson("/session/resume", { method: "POST" });
    await loadStatus();
  }, [loadStatus]);

  const startBathroomBreak = useCallback(async () => {
    await saveConfig();
    await fetchJson("/bathroom-break/start", { method: "POST" });
    await loadStatus();
  }, [loadStatus, saveConfig]);

  const cancelBathroomBreak = useCallback(async () => {
    await fetchJson("/bathroom-break/cancel", { method: "POST" });
    await loadStatus();
  }, [loadStatus]);

  const addTodo = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = todoInput.trim();
      if (!value) {
        return;
      }

      setTodos((prev) => [...prev, { id: crypto.randomUUID(), text: value, done: false }]);
      setTodoInput("");
    },
    [todoInput],
  );

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  }, []);

  const removeTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  const session = status?.session;
  const sessionActive = Boolean(session?.active);
  const sessionPaused = Boolean(session?.manual_paused);
  const bathroomActive = Boolean(session?.bathroom_break_active);
  const sessionRunning = sessionActive && session?.phase === "study" && !sessionPaused && !bathroomActive;
  const displayedTimerSeconds = sessionActive ? (session?.phase_remaining_seconds ?? studySeconds) : studySeconds;
  const canAdjust = !sessionActive;

  const sessionStatusLabel = useMemo(() => {
    if (!sessionActive) {
      return "Stopped";
    }
    if (bathroomActive) {
      return "Bathroom";
    }
    if (sessionPaused) {
      return "Paused";
    }
    if (session?.phase === "break") {
      return "On Break";
    }
    return "Studying";
  }, [bathroomActive, session?.phase, sessionActive, sessionPaused]);

  const centerPanelStateClasses = status?.alert_active
    ? "border-red-400 bg-red-900/50"
    : sessionRunning
      ? "border-[var(--border-strong)] bg-[#1b1412]"
      : "border-[var(--border-strong)] bg-[#2a211d]";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1650px] px-4 py-8 md:px-8">
      <audio loop ref={alarmRef} src="/alarm.mp3" preload="auto" />

      <header className="mb-6 text-center">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          <span className="inline-block rounded-md bg-white px-3 py-1 text-[var(--bg)]">LockedIn</span> Study Timer
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Stay in frame and stay focused.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[300px_minmax(0,1.25fr)_300px]">
        <aside className="panel rounded-2xl p-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="mt-1 text-xs text-[var(--text-subtle)]">Adjust sliders before starting a session.</p>

          <div className="mt-4 space-y-4 text-sm">
            <label className="block">
              <span>Study time: {secondsToMinutesString(studySeconds)} min</span>
              <input
                className="mt-1 w-full"
                disabled={!canAdjust}
                max={180}
                min={5}
                onChange={(event) => {
                  setSelectedMode("custom");
                  setStudySeconds(Number(event.target.value) * 60);
                }}
                type="range"
                value={Math.round(studySeconds / 60)}
              />
            </label>

            <label className="block">
              <span>Break time: {secondsToMinutesString(breakSeconds)} min</span>
              <input
                className="mt-1 w-full"
                disabled={!canAdjust}
                max={60}
                min={5}
                onChange={(event) => {
                  setSelectedMode("custom");
                  setBreakSeconds(Number(event.target.value) * 60);
                }}
                type="range"
                value={Math.round(breakSeconds / 60)}
              />
            </label>

            <label className="block">
              <span>Absence alert: {absenceSeconds} sec</span>
              <input
                className="mt-1 w-full"
                disabled={!canAdjust}
                max={300}
                min={5}
                onChange={(event) => setAbsenceSeconds(Number(event.target.value))}
                type="range"
                value={absenceSeconds}
              />
            </label>

            <label className="block">
              <span>Bathroom break: {secondsToMinutesString(bathroomSeconds)} min</span>
              <input
                className="mt-1 w-full"
                disabled={!canAdjust}
                max={30}
                min={1}
                onChange={(event) => setBathroomSeconds(Number(event.target.value) * 60)}
                type="range"
                value={Math.round(bathroomSeconds / 60)}
              />
            </label>
          </div>

          <button className="mt-4 w-full rounded-lg border px-3 py-2 text-sm" disabled={!canAdjust} onClick={saveConfig} type="button">
            Save Settings
          </button>

          <button
            className="mt-3 w-full rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-sm"
            onClick={async () => {
              setAlarmEnabled(true);
              if (alarmRef.current) {
                try {
                  alarmRef.current.currentTime = 0;
                  await alarmRef.current.play();
                  alarmRef.current.pause();
                  alarmRef.current.currentTime = 0;
                } catch {
                  // User may need another interaction in some browsers.
                }
              }
            }}
            type="button"
          >
            {alarmEnabled ? "Alarm Enabled" : "Enable Alarm Sound"}
          </button>
        </aside>

        <section className={`rounded-2xl border p-8 md:p-10 ${centerPanelStateClasses}`}>
          <div className="mb-6 flex justify-center gap-2">
            <button
              className={`rounded-lg border px-4 py-2 text-sm ${selectedMode === "chill" ? "bg-[var(--accent-soft)]" : ""}`}
              disabled={!canAdjust}
              onClick={() => applyMode("chill")}
              type="button"
            >
              Chill
            </button>
            <button
              className={`rounded-lg border px-4 py-2 text-sm ${selectedMode === "regular" ? "bg-[var(--accent-soft)]" : ""}`}
              disabled={!canAdjust}
              onClick={() => applyMode("regular")}
              type="button"
            >
              Regular
            </button>
            <button
              className={`rounded-lg border px-4 py-2 text-sm ${selectedMode === "exams" ? "bg-[var(--accent-soft)]" : ""}`}
              disabled={!canAdjust}
              onClick={() => applyMode("exams")}
              type="button"
            >
              Exams
            </button>
          </div>

          <div className="text-center">
            <p className="mx-auto inline-flex rounded-full border border-[var(--border-strong)] bg-[rgba(255,255,255,0.06)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text)]">
              {sessionStatusLabel}
            </p>
            <div className="mt-5 text-7xl font-semibold leading-none tracking-[-0.05em] md:text-9xl">
              {formatClock(displayedTimerSeconds)}
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">Total active: {formatClock(session?.total_active_seconds ?? 0)}</p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            <button
              className="rounded-xl border px-4 py-5 text-lg font-semibold"
              onClick={sessionActive ? stopSession : startSession}
              type="button"
            >
              {sessionActive ? "Stop" : "Start"}
            </button>

            <button
              className="rounded-xl border px-4 py-5 text-lg font-semibold"
              disabled={!sessionActive}
              onClick={sessionPaused ? resumeSession : pauseSession}
              type="button"
            >
              {sessionPaused ? "Resume" : "Pause"}
            </button>

            <button
              className="rounded-xl border px-4 py-5 text-lg font-semibold"
              disabled={!sessionActive}
              onClick={bathroomActive ? cancelBathroomBreak : startBathroomBreak}
              type="button"
            >
              {bathroomActive ? "End Bathroom" : "Bathroom"}
            </button>
          </div>

          <div className="mt-6 grid gap-1 text-sm text-[var(--text-muted)] md:grid-cols-2">
            <p>Presence: {status?.present ? "Present" : "Not in frame"}</p>
            <p>Alert: {status?.alert_active ? "ALERT" : "Normal"}</p>
            <p>Alert in: {status?.seconds_until_alert ?? 0}s</p>
            <p>Bathroom: {bathroomActive ? `${session?.bathroom_seconds_left ?? 0}s left` : "Inactive"}</p>
            <p>Manual pause: {sessionPaused ? "Paused" : "Running"}</p>
            <p>Last error: {status?.last_error ?? "None"}</p>
          </div>
        </section>

        <aside className="panel rounded-2xl p-4">
          <h2 className="text-lg font-semibold">Checklist</h2>
          <form className="mt-3 flex gap-2" onSubmit={addTodo}>
            <input
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
              onChange={(event) => setTodoInput(event.target.value)}
              placeholder="Add task"
              value={todoInput}
            />
            <button className="rounded-lg border px-3 py-2 text-sm" type="submit">
              Add
            </button>
          </form>

          <div className="mt-3 space-y-2">
            {todos.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No tasks yet.</p> : null}
            {todos.map((todo) => (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2" key={todo.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input checked={todo.done} onChange={() => toggleTodo(todo.id)} type="checkbox" />
                  <span className={todo.done ? "line-through text-[var(--text-subtle)]" : ""}>{todo.text}</span>
                </label>
                <button className="text-xs text-[var(--text-subtle)]" onClick={() => removeTodo(todo.id)} type="button">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {loading ? <p className="mt-4 text-sm text-[var(--text-muted)]">Loading...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-300">Backend error: {error}</p> : null}

      <footer className="mt-8 border-t pt-4 text-center text-xs text-[var(--text-subtle)]">
        ECEHacks 2026 | Arman Mahdavi | Aadit Mital | TMU Electrical/Computer Engineering 2026
      </footer>
    </main>
  );
}
