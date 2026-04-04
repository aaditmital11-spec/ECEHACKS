"use client";

import Link from "next/link";
import { useMemo } from "react";
import { History, Settings2 } from "lucide-react";

import { CompletionModal } from "@/components/timer/completion-modal";
import { BathroomBreakCard } from "@/components/timer/bathroom-break-card";
import { LabelChip } from "@/components/timer/label-chip";
import { ModeSwitcher } from "@/components/timer/mode-switcher";
import { PomodoroPresetControls } from "@/components/timer/pomodoro-preset-controls";
import { TimerControls } from "@/components/timer/timer-controls";
import { TodoPanel } from "@/components/todo/todo-panel";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getDashboardAnalytics } from "@/lib/analytics";
import { appName, appTagline, focusQuotes, modeMeta, subjects } from "@/lib/constants";
import { formatClock, formatDuration, formatDurationLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useBathroomBreak } from "@/hooks/use-bathroom-break";
import { useTimerEngine } from "@/hooks/use-timer-engine";
import { useAppStore } from "@/store/app-store";

function getPomodoroPhaseLabel(phase: "focus" | "short-break" | "long-break") {
  if (phase === "short-break") {
    return "Short break";
  }

  if (phase === "long-break") {
    return "Long break";
  }

  return "Focus block";
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value || min, min), max);
}

const landingFrame = "mx-auto w-full max-w-[1440px] px-5 py-6 md:px-8 md:py-8 xl:px-10";
const landingGridGap = "gap-5";

export default function LandingPage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const settings = useAppStore((state) => state.settings);
  const sessions = useAppStore((state) => state.sessions);
  const todos = useAppStore((state) => state.todos);
  const activeMode = useAppStore((state) => state.activeMode);
  const selectedSubjectId = useAppStore((state) => state.selectedSubjectId);
  const quickNote = useAppStore((state) => state.quickNote);
  const setActiveMode = useAppStore((state) => state.setActiveMode);
  const setSelectedSubjectId = useAppStore((state) => state.setSelectedSubjectId);
  const setQuickNote = useAppStore((state) => state.setQuickNote);
  const addTodo = useAppStore((state) => state.addTodo);
  const toggleTodo = useAppStore((state) => state.toggleTodo);
  const deleteTodo = useAppStore((state) => state.deleteTodo);
  const clearCompletedTodos = useAppStore((state) => state.clearCompletedTodos);
  const updatePomodoroDefaults = useAppStore((state) => state.updatePomodoroDefaults);
  const updateCountdownDefault = useAppStore((state) => state.updateCountdownDefault);
  const updateDeepFocusDefault = useAppStore((state) => state.updateDeepFocusDefault);
  const setBathroomBreakDurationSec = useAppStore((state) => state.setBathroomBreakDurationSec);
  const setAbsenceAlertThresholdSec = useAppStore((state) => state.setAbsenceAlertThresholdSec);
  const {
    activeSession,
    completionDraft,
    displayMs,
    elapsedMs,
    progress,
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
    stopSession,
    skipBreak,
    saveCompletion,
    saveAndStartAnother,
    saveAndStartBreak,
    updateCompletionNote,
  } = useTimerEngine();
  const { activeBathroomBreak, remainingMs: bathroomBreakRemainingMs, startBathroomBreak, cancelBathroomBreak } =
    useBathroomBreak();

  const analytics = useMemo(() => getDashboardAnalytics(sessions, todos), [sessions, todos]);
  const displayMode = activeSession?.mode ?? activeMode;
  const statusLabel = activeSession ? (activeSession.isRunning ? "In progress" : "Paused") : "Ready";
  const subjectId = activeSession?.subjectId ?? selectedSubjectId;
  const plannedDurationLabel = activeSession?.plannedDurationMs
    ? formatDurationLabel(activeSession.plannedDurationMs)
    : displayMode === "countdown"
      ? formatDurationLabel(settings.timerDefaults.countdown.durationMin * 60000)
      : displayMode === "deep-focus"
        ? formatDurationLabel(settings.timerDefaults.deepFocusDurationMin * 60000)
        : displayMode === "pomodoro"
          ? formatDurationLabel(settings.timerDefaults.pomodoro.focusDurationMin * 60000)
          : "Open-ended";
  const phaseLabel =
    activeSession?.mode === "pomodoro" ? getPomodoroPhaseLabel(activeSession.pomodoroPhase) : modeMeta[displayMode].label;
  const currentQuote = focusQuotes[(analytics.overview.sessionsThisWeek + subjectId.length) % focusQuotes.length];

  if (!hydrated) {
    return (
      <main className="min-h-screen">
        <section className={landingFrame}>
          <div className="h-14 w-56 rounded-2xl bg-white/5" />
          <div className="mt-8 grid items-start gap-5 xl:grid-cols-[336px_minmax(0,1fr)]">
            <div className="h-[620px] rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />
            <div className="h-[620px] rounded-[40px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <section className={landingFrame}>
        <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Link
              href="/"
              className="focus-ring inline-block text-[2.8rem] font-semibold tracking-[-0.06em] text-[var(--text)] md:text-[4.2rem] md:leading-none"
            >
              {appName}
            </Link>
            <p className="max-w-md text-sm leading-6 text-[var(--text-muted)]">{appTagline}</p>
          </div>
          <nav className="flex items-center gap-2 self-start">
            <Link
              href="/app/history"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full px-4")}
            >
              <History className="size-4" />
              History
            </Link>
            <Link
              href="/app/settings"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full px-4")}
            >
              <Settings2 className="size-4" />
              Settings
            </Link>
          </nav>
        </header>

        <section className={`mt-8 grid items-start ${landingGridGap} xl:grid-cols-[336px_minmax(0,1fr)]`}>
          <TodoPanel
            todos={todos}
            onAdd={addTodo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onClearCompleted={clearCompletedTodos}
          />

          <Card className="surface-grid rounded-[40px] border-[var(--border-strong)]">
            <CardContent className="space-y-6 px-4 py-4 md:px-8 md:py-8">
              <div className="space-y-4">
                <ModeSwitcher
                  value={activeMode}
                  pomodoroConfig={settings.timerDefaults.pomodoro}
                  onChange={setActiveMode}
                  onApplyPreset={(focusMin, breakMin) =>
                    updatePomodoroDefaults({
                      focusDurationMin: focusMin,
                      shortBreakDurationMin: breakMin,
                      longBreakDurationMin: breakMin,
                    })
                  }
                  disabled={Boolean(activeSession)}
                />
                {activeSession ? (
                  <p className="text-center text-sm text-[var(--text-subtle)]">
                    Finish or stop the current session before switching modes.
                  </p>
                ) : null}
              </div>

              <div className="rounded-[34px] border border-[var(--border-strong)] bg-[linear-gradient(180deg,var(--bg-elevated)_0%,rgba(255,255,255,0.015)_100%)] px-5 py-8 md:px-8 md:py-10">
                <div className="flex flex-col items-center text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                      {phaseLabel}
                    </span>
                    <LabelChip subjectId={subjectId} />
                    <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
                      Planned {plannedDurationLabel}
                    </span>
                  </div>

                  <p className="mt-8 text-xs uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                    {activeSession?.mode === "stopwatch" ? "Elapsed" : "Remaining"}
                  </p>
                  <div className="mt-4 text-[4.75rem] font-semibold tracking-[-0.06em] text-[var(--text)] md:text-[7.5rem] md:leading-none">
                    {formatDuration(displayMs)}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-sm text-[var(--text-muted)]">
                    <span>Status {statusLabel}</span>
                    <span>Elapsed {formatDuration(elapsedMs)}</span>
                    <span>{Math.round(progress * 100)}% through session</span>
                  </div>

                  {displayMode !== "stopwatch" ? (
                    <div className="mt-6 w-full max-w-[620px]">
                      <div className="h-2 rounded-full bg-white/6">
                        <div
                          className="h-2 rounded-full bg-[var(--accent)] transition-[width] duration-300"
                          style={{ width: `${Math.max(progress * 100, activeSession ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-8 flex justify-center">
                    <TimerControls
                      activeSession={activeSession}
                      onStart={() => startSession(displayMode)}
                      onPause={pauseSession}
                      onResume={resumeSession}
                      onReset={() => {
                        if (activeSession) {
                          resetSession();
                          return;
                        }

                        setQuickNote("");
                      }}
                      onStop={stopSession}
                      onSkipBreak={skipBreak}
                    />
                  </div>

                  <p className="mt-6 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{currentQuote}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.72fr_1.28fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text)]" htmlFor="landing-subject">
                    Subject
                  </label>
                  <Select
                    id="landing-subject"
                    value={selectedSubjectId}
                    disabled={Boolean(activeSession)}
                    onChange={(event) => setSelectedSubjectId(event.target.value)}
                  >
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text)]" htmlFor="landing-note">
                    Session note
                  </label>
                  <Input
                    id="landing-note"
                    value={quickNote}
                    disabled={Boolean(activeSession)}
                    onChange={(event) => setQuickNote(event.target.value)}
                    placeholder="What are you working on?"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 md:px-5">
                {displayMode === "pomodoro" ? (
                  <PomodoroPresetControls
                    config={settings.timerDefaults.pomodoro}
                    disabled={Boolean(activeSession)}
                    onFocusChange={(focusMin) => updatePomodoroDefaults({ focusDurationMin: clampNumber(focusMin, 15, 180) })}
                    onBreakChange={(breakMin) =>
                      updatePomodoroDefaults({
                        shortBreakDurationMin: clampNumber(breakMin, 5, 60),
                        longBreakDurationMin: clampNumber(breakMin, 5, 60),
                      })
                    }
                  />
                ) : null}

                {displayMode === "countdown" ? (
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--text)]">Countdown duration</p>
                      <p className="text-sm text-[var(--text-muted)]">Set a target duration and start immediately.</p>
                    </div>
                    <div className="w-full md:w-[180px]">
                      <Input
                        type="number"
                        min={5}
                        max={240}
                        value={settings.timerDefaults.countdown.durationMin}
                        disabled={Boolean(activeSession)}
                        onChange={(event) => updateCountdownDefault(clampNumber(Number(event.target.value), 5, 240))}
                      />
                    </div>
                  </div>
                ) : null}

                {displayMode === "deep-focus" ? (
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--text)]">Deep Focus duration</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        Keep the main timer here, then step into the fuller workspace when you want the immersive view.
                      </p>
                    </div>
                    <div className="w-full md:w-[180px]">
                      <Input
                        type="number"
                        min={15}
                        max={240}
                        value={settings.timerDefaults.deepFocusDurationMin}
                        disabled={Boolean(activeSession)}
                        onChange={(event) => updateDeepFocusDefault(clampNumber(Number(event.target.value), 15, 240))}
                      />
                    </div>
                  </div>
                ) : null}

                {displayMode === "stopwatch" ? (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">Open-ended tracking</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Start when you begin and stop when you are ready to save the session.
                      </p>
                    </div>
                    <Link
                      href="/app/history"
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start rounded-full px-4")}
                    >
                      Review history
                    </Link>
                  </div>
                ) : null}
              </div>

              <BathroomBreakCard
                breakDurationSec={settings.bathroomBreakDurationSec}
                absenceAlertThresholdSec={settings.absenceAlertThresholdSec}
                activeBathroomBreak={activeBathroomBreak}
                remainingMs={bathroomBreakRemainingMs}
                onBreakDurationChange={setBathroomBreakDurationSec}
                onThresholdChange={setAbsenceAlertThresholdSec}
                onStart={startBathroomBreak}
                onCancel={cancelBathroomBreak}
              />
            </CardContent>
          </Card>
        </section>

        <section className={`mt-5 grid ${landingGridGap} lg:grid-cols-[0.78fr_0.78fr_0.88fr_1.16fr]`}>
          <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Today</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
              {formatDurationLabel(analytics.overview.todayFocusMs)}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Completed focus time saved today.</p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Streak</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
              {analytics.overview.streakCount} days
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Best day this week: {analytics.overview.bestDayLabel}.</p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Tasks</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
              {analytics.todoSummary.completedToday}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {analytics.todoSummary.openCount} still open, {analytics.todoSummary.completedThisWeek} completed this week.
            </p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Recent sessions</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">A compact view of your latest saved work.</p>
              </div>
              <Link
                href="/app/history"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full px-4")}
              >
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {analytics.recentSessions.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--text-muted)]">No sessions saved yet. Start here and your history will build as you go.</p>
              ) : (
                analytics.recentSessions.slice(0, 2).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <LabelChip subjectId={session.subjectId} />
                      <p className="mt-2 text-sm font-medium text-[var(--text)]">{formatDurationLabel(session.actualDurationMs)}</p>
                      <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{session.note?.trim() || modeMeta[session.mode].label}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-[var(--text-subtle)]">
                      <p>{formatClock(session.endedAt)}</p>
                      <p className="mt-1">{modeMeta[session.mode].label}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </section>

      <CompletionModal
        draft={completionDraft}
        activeSession={activeSession}
        onSave={saveCompletion}
        onStartAnother={saveAndStartAnother}
        onStartBreak={saveAndStartBreak}
        onNoteChange={updateCompletionNote}
      />
    </main>
  );
}
