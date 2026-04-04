"use client";

import { useEffect, useMemo, useState } from "react";
import { Expand, Minimize2, X } from "lucide-react";

import { CompletionModal } from "@/components/timer/completion-modal";
import { BathroomBreakCard } from "@/components/timer/bathroom-break-card";
import { EmptyState } from "@/components/empty-state";
import { ModeSwitcher } from "@/components/timer/mode-switcher";
import { PomodoroPresetControls } from "@/components/timer/pomodoro-preset-controls";
import { TimerCard } from "@/components/timer/timer-card";
import { TimerControls } from "@/components/timer/timer-controls";
import { TodoPanel } from "@/components/todo/todo-panel";
import { SessionStatsCard } from "@/components/dashboard/session-stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getDashboardAnalytics } from "@/lib/analytics";
import { focusQuotes, modeMeta, subjects } from "@/lib/constants";
import { formatDurationLabel } from "@/lib/time";
import { useBathroomBreak } from "@/hooks/use-bathroom-break";
import { useTimerEngine } from "@/hooks/use-timer-engine";
import { useAppStore } from "@/store/app-store";

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value || min, min), max);
}

export default function TimerPage() {
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
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);

  const displayMode = activeSession?.mode ?? activeMode;
  const currentQuote = focusQuotes[(analytics.overview.sessionsThisWeek + selectedSubjectId.length) % focusQuotes.length];

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenActive(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  }

  if (!hydrated) {
    return <div className="h-[520px] rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />;
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1.15fr)_0.9fr]">
        <TodoPanel
          todos={todos}
          onAdd={addTodo}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onClearCompleted={clearCompletedTodos}
        />

        <div className="space-y-4">
          <Card className="rounded-[32px]">
            <CardHeader>
              <CardTitle>Timer workspace</CardTitle>
              <CardDescription>Structured controls, calm surfaces, and reliable local state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ModeSwitcher value={activeMode} onChange={setActiveMode} disabled={Boolean(activeSession)} />
              {activeSession ? (
                <p className="text-sm text-[var(--text-subtle)]">
                  Finish or stop the current session before switching modes.
                </p>
              ) : null}
              <TimerCard
                mode={displayMode}
                activeSession={activeSession}
                displayMs={displayMs}
                elapsedMs={elapsedMs}
                progress={progress}
              />
              <div className="flex flex-wrap items-center justify-between gap-4">
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
                {(displayMode === "deep-focus" || activeSession?.mode === "deep-focus") && (
                  <Button variant="secondary" onClick={() => setImmersiveOpen(true)}>
                    Enter Deep Focus
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <SessionStatsCard
              label="Today"
              value={formatDurationLabel(analytics.overview.todayFocusMs)}
              helper="Completed focus time logged today."
            />
            <SessionStatsCard
              label="Week"
              value={formatDurationLabel(analytics.overview.weekFocusMs)}
              helper={`${analytics.overview.sessionsThisWeek} sessions ended this week.`}
            />
            <SessionStatsCard
              label="Completion"
              value={`${analytics.overview.completionRate}%`}
              helper={`Average session: ${formatDurationLabel(analytics.overview.averageSessionMs)}.`}
            />
            <SessionStatsCard
              label="Tasks"
              value={`${analytics.todoSummary.completedToday}`}
              helper={`${analytics.todoSummary.openCount} still open right now.`}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="rounded-[32px]">
            <CardHeader>
              <CardTitle>Session setup</CardTitle>
              <CardDescription>Choose a subject, keep a short note, and adjust the active mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text)]" htmlFor="subject">
                  Subject
                </label>
                <Select id="subject" value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text)]" htmlFor="note">
                  Session note
                </label>
                <Textarea
                  id="note"
                  value={quickNote}
                  onChange={(event) => setQuickNote(event.target.value)}
                  placeholder="Optional note for what you plan to cover."
                />
              </div>

              {activeMode === "pomodoro" && (
                <div className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <h3 className="text-sm font-medium text-[var(--text)]">Pomodoro settings</h3>
                  <PomodoroPresetControls
                    config={settings.timerDefaults.pomodoro}
                    disabled={Boolean(activeSession)}
                    onApplyPreset={(focusMin, breakMin) =>
                      updatePomodoroDefaults({
                        focusDurationMin: focusMin,
                        shortBreakDurationMin: breakMin,
                        longBreakDurationMin: breakMin,
                      })
                    }
                    onFocusChange={(focusMin) =>
                      updatePomodoroDefaults({ focusDurationMin: clampNumber(focusMin, 15, 180) })
                    }
                    onBreakChange={(breakMin) =>
                      updatePomodoroDefaults({
                        shortBreakDurationMin: clampNumber(breakMin, 5, 60),
                        longBreakDurationMin: clampNumber(breakMin, 5, 60),
                      })
                    }
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      type="number"
                      min={5}
                      max={60}
                      value={settings.timerDefaults.pomodoro.longBreakDurationMin}
                      onChange={(event) =>
                        updatePomodoroDefaults({
                          longBreakDurationMin: clampNumber(Number(event.target.value), 5, 60),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={2}
                      max={8}
                      value={settings.timerDefaults.pomodoro.cyclesBeforeLongBreak}
                      onChange={(event) =>
                        updatePomodoroDefaults({
                          cyclesBeforeLongBreak: clampNumber(Number(event.target.value), 2, 8),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3">
                      <span className="text-sm text-[var(--text-muted)]">Auto-start breaks</span>
                      <Switch
                        checked={settings.timerDefaults.pomodoro.autoStartBreak}
                        onCheckedChange={(checked) => updatePomodoroDefaults({ autoStartBreak: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3">
                      <span className="text-sm text-[var(--text-muted)]">Auto-start next focus phase</span>
                      <Switch
                        checked={settings.timerDefaults.pomodoro.autoStartNextPhase}
                        onCheckedChange={(checked) => updatePomodoroDefaults({ autoStartNextPhase: checked })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeMode === "countdown" && (
                <div className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <h3 className="text-sm font-medium text-[var(--text)]">Countdown settings</h3>
                  <Input
                    type="number"
                    min={5}
                    max={240}
                    value={settings.timerDefaults.countdown.durationMin}
                    onChange={(event) => updateCountdownDefault(clampNumber(Number(event.target.value), 5, 240))}
                  />
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    This mode runs to a fixed finish and saves the completed session when you confirm it.
                  </p>
                </div>
              )}

              {activeMode === "stopwatch" && (
                <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <h3 className="text-sm font-medium text-[var(--text)]">Stopwatch mode</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Use this when you want open-ended tracking. Stop the session whenever you are done, then save it
                    with a note.
                  </p>
                </div>
              )}

              {activeMode === "deep-focus" && (
                <div className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <h3 className="text-sm font-medium text-[var(--text)]">Deep Focus settings</h3>
                  <Input
                    type="number"
                    min={15}
                    max={240}
                    value={settings.timerDefaults.deepFocusDurationMin}
                    onChange={(event) => updateDeepFocusDefault(clampNumber(Number(event.target.value), 15, 240))}
                  />
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    A quieter timer surface with fullscreen support and less secondary UI once you step in.
                  </p>
                </div>
              )}

              <BathroomBreakCard
                breakDurationSec={settings.bathroomBreakDurationSec}
                absenceAlertThresholdSec={settings.absenceAlertThresholdSec}
                activeBathroomBreak={activeBathroomBreak}
                remainingMs={bathroomBreakRemainingMs}
                disabled={Boolean(activeSession?.isRunning)}
                onBreakDurationChange={setBathroomBreakDurationSec}
                onThresholdChange={setAbsenceAlertThresholdSec}
                onStart={startBathroomBreak}
                onCancel={cancelBathroomBreak}
              />
            </CardContent>
          </Card>

          <Card className="rounded-[32px]">
            <CardHeader>
              <CardTitle>Guidance</CardTitle>
              <CardDescription>{modeMeta[displayMode].label} is tuned for deliberate study sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="text-sm leading-6 text-[var(--text-muted)]">{currentQuote}</p>
              </div>
              {sessions.length === 0 ? (
                <EmptyState
                  title="No saved sessions yet"
                  description="Completed or manually saved sessions will start building your dashboard and history."
                />
              ) : (
                <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Best day this week</p>
                  <p className="mt-3 text-lg font-semibold tracking-tight text-[var(--text)]">
                    {analytics.overview.bestDayLabel}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Current streak: {analytics.overview.streakCount} days. {analytics.todoSummary.completedThisWeek} tasks finished this week.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {immersiveOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[linear-gradient(180deg,#0d0f12_0%,#101514_100%)]">
          <div className="surface-grid min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto flex max-w-[980px] items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Deep Focus</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">A quieter workspace for uninterrupted study.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={toggleFullscreen}>
                  {fullscreenActive ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
                  {fullscreenActive ? "Exit fullscreen" : "Fullscreen"}
                </Button>
                <Button variant="ghost" onClick={() => setImmersiveOpen(false)}>
                  <X className="size-4" />
                  Close
                </Button>
              </div>
            </div>

            <div className="mx-auto mt-8 max-w-[980px]">
              <TimerCard
                mode="deep-focus"
                activeSession={activeSession}
                displayMs={displayMs}
                elapsedMs={elapsedMs}
                progress={progress}
                immersive
              />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <TimerControls
                  activeSession={activeSession}
                  onStart={() => startSession("deep-focus")}
                  onPause={pauseSession}
                  onResume={resumeSession}
                  onReset={() => {
                    if (activeSession) {
                      resetSession();
                    } else {
                      setQuickNote("");
                    }
                  }}
                  onStop={stopSession}
                  onSkipBreak={skipBreak}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <CompletionModal
        draft={completionDraft}
        activeSession={activeSession}
        onSave={saveCompletion}
        onStartAnother={saveAndStartAnother}
        onStartBreak={saveAndStartBreak}
        onNoteChange={updateCompletionNote}
      />
    </>
  );
}
