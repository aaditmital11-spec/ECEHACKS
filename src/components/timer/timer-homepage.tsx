"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Expand, History, Minimize2, Settings, Sparkles, X } from "lucide-react";

import { PresenceCard } from "@/components/timer/presence-card";
import { ModeSwitcher } from "@/components/timer/mode-switcher";
import { TimerCard } from "@/components/timer/timer-card";
import { TimerControls } from "@/components/timer/timer-controls";
import { TodoPanel } from "@/components/todo/todo-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { presenceStreamUrl, isPresenceServiceReady } from "@/lib/presence";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { appName, focusQuotes, getStudyPreset, isStudyMode, modeMeta, subjects } from "@/lib/constants";
import { primePresenceAlarmAudio } from "@/lib/presence-alarm";
import { useTimerEngine } from "@/hooks/use-timer-engine";
import { useAppStore } from "@/store/app-store";

import { CompletionModal } from "./completion-modal";

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value || min, min), max);
}

const quickLinks = [
  { href: "/app/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/app/history", label: "History", icon: History },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function TimerHomepage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const settings = useAppStore((state) => state.settings);
  const sessions = useAppStore((state) => state.sessions);
  const todos = useAppStore((state) => state.todos);
  const activeMode = useAppStore((state) => state.activeMode);
  const selectedSubjectId = useAppStore((state) => state.selectedSubjectId);
  const quickNote = useAppStore((state) => state.quickNote);
  const presenceRuntime = useAppStore((state) => state.presenceRuntime);
  const setActiveMode = useAppStore((state) => state.setActiveMode);
  const setSelectedSubjectId = useAppStore((state) => state.setSelectedSubjectId);
  const setQuickNote = useAppStore((state) => state.setQuickNote);
  const addTodo = useAppStore((state) => state.addTodo);
  const toggleTodo = useAppStore((state) => state.toggleTodo);
  const deleteTodo = useAppStore((state) => state.deleteTodo);
  const clearCompletedTodos = useAppStore((state) => state.clearCompletedTodos);
  const updateCountdownDefault = useAppStore((state) => state.updateCountdownDefault);
  const updateDeepFocusDefault = useAppStore((state) => state.updateDeepFocusDefault);
  const updatePresenceSettings = useAppStore((state) => state.updatePresenceSettings);
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
    dismissCompletion,
    updateCompletionNote,
  } = useTimerEngine();
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);

  const displayMode = activeSession?.mode ?? activeMode;
  const activeStudyPreset = getStudyPreset(displayMode);
  const presenceReady = isPresenceServiceReady(presenceRuntime);
  /** Allow starting even if the local service is still booting; monitoring turns on once /status is healthy. */
  const canStartWithPresence = true;
  const canResumeWithPresence =
    !settings.presence.enabled ||
    presenceRuntime.awaitingManualResume ||
    !presenceRuntime.isRecoveryCountdownActive ||
    (presenceReady && presenceRuntime.isPresent);
  const timerStatusLabel = presenceRuntime.isRecoveryCountdownActive
    ? "Recovery window"
    : presenceRuntime.awaitingManualResume
      ? "Ready to resume"
      : undefined;
  const focusStateLabel = settings.presence.enabled
    ? presenceRuntime.isRecoveryCountdownActive
      ? "Presence warning"
      : "Presence-aware"
    : "Structured";
  const currentQuote = useMemo(
    () => focusQuotes[(sessions.length + selectedSubjectId.length) % focusQuotes.length],
    [selectedSubjectId.length, sessions.length],
  );

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
      <section className="grid items-start gap-4 xl:grid-cols-[280px_minmax(0,1.18fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-[32px] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.015)_100%)] px-5 py-5">
            <Link
              href="/"
              className="focus-ring inline-block rounded-lg text-[3.1rem] font-semibold leading-none tracking-[-0.07em] text-[var(--text)] transition-colors hover:text-[var(--accent)] md:text-[3.7rem]"
            >
              {appName}
            </Link>
          </div>
          <TodoPanel
            compact
            todos={todos}
            onAdd={addTodo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onClearCompleted={clearCompletedTodos}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="focus-ring group flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.015)_100%)] px-4 py-4 text-[var(--text-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--accent)] transition-colors group-hover:border-[var(--border-strong)]">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-medium tracking-[-0.02em]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="surface-grid rounded-[36px] border-[var(--border-strong)]">
            <CardContent className="space-y-5 px-5 py-5 md:px-7 md:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <ModeSwitcher value={activeMode} onChange={setActiveMode} disabled={Boolean(activeSession)} />
                  {activeSession ? (
                    <p className="text-sm text-[var(--text-subtle)]">
                      Finish or stop the current session before switching modes.
                    </p>
                  ) : null}
                </div>
                {(displayMode === "deep-focus" || activeSession?.mode === "deep-focus") && (
                  <Button variant="secondary" onClick={() => setImmersiveOpen(true)}>
                    Enter Deep Focus
                  </Button>
                )}
              </div>

              <TimerCard
                mode={displayMode}
                activeSession={activeSession}
                displayMs={displayMs}
                elapsedMs={elapsedMs}
                progress={progress}
                statusLabel={timerStatusLabel}
                focusStateLabel={focusStateLabel}
                warning={presenceRuntime.isRecoveryCountdownActive}
              />

              <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <TimerControls
                  activeSession={activeSession}
                  onStart={() => {
                    void primePresenceAlarmAudio();
                    startSession(displayMode);
                  }}
                  onPause={pauseSession}
                  onResume={() => {
                    void primePresenceAlarmAudio();
                    resumeSession();
                  }}
                  onReset={() => {
                    if (activeSession) {
                      resetSession();
                      return;
                    }

                    setQuickNote("");
                  }}
                  onStop={stopSession}
                  onSkipBreak={skipBreak}
                  startDisabled={!canStartWithPresence}
                  resumeDisabled={!canResumeWithPresence}
                  startLabel="Start session"
                  resumeLabel={presenceRuntime.awaitingManualResume ? "Resume focus" : "Resume"}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[0.7fr_1fr_auto]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text)]" htmlFor="home-subject">
                    Subject
                  </label>
                  <Select
                    id="home-subject"
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
                  <label className="text-sm font-medium text-[var(--text)]" htmlFor="home-note">
                    Session note
                  </label>
                  <Textarea
                    id="home-note"
                    value={quickNote}
                    disabled={Boolean(activeSession)}
                    onChange={(event) => setQuickNote(event.target.value)}
                    placeholder="What are you focusing on?"
                    className="min-h-[88px]"
                  />
                </div>
                <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 lg:min-w-[220px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">Focus lock</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Pause and protect the session if you step away. Requires the local presence service (e.g.{" "}
                        <code className="rounded bg-white/6 px-1 py-0.5 text-[0.8rem]">npm run dev:presence</code>).
                      </p>
                    </div>
                    <Switch
                      checked={settings.presence.enabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          void primePresenceAlarmAudio();
                        }
                        updatePresenceSettings({ enabled: checked });
                      }}
                    />
                  </div>
                  <p className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                    <Sparkles className="size-3.5 text-[var(--accent)]" />
                    {presenceReady ? "Service ready" : "Awaiting camera"}
                  </p>
                  {settings.presence.enabled && !presenceReady ? (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Run the Python service on port 8765, then refresh—away detection starts automatically once the camera
                      connects.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[26px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                {isStudyMode(displayMode) && activeStudyPreset ? (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{modeMeta[displayMode].label} session plan</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {activeStudyPreset.focusMin} minutes of study followed by a {activeStudyPreset.breakMin} minute break.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <span className="rounded-full border border-[var(--border)] px-3 py-1.5">
                        Study {activeStudyPreset.focusMin}m
                      </span>
                      <span className="rounded-full border border-[var(--border)] px-3 py-1.5">
                        Break {activeStudyPreset.breakMin}m
                      </span>
                    </div>
                  </div>
                ) : displayMode === "countdown" ? (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">Countdown duration</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">Set a finish line and start immediately.</p>
                    </div>
                    <Input
                      className="w-full md:w-[170px]"
                      type="number"
                      min={5}
                      max={240}
                      value={settings.timerDefaults.countdown.durationMin}
                      disabled={Boolean(activeSession)}
                      onChange={(event) => updateCountdownDefault(clampNumber(Number(event.target.value), 5, 240))}
                    />
                  </div>
                ) : displayMode === "deep-focus" ? (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">Deep Focus duration</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">Start here, then step into the immersive view when you want it.</p>
                    </div>
                    <Input
                      className="w-full md:w-[170px]"
                      type="number"
                      min={15}
                      max={240}
                      value={settings.timerDefaults.deepFocusDurationMin}
                      disabled={Boolean(activeSession)}
                      onChange={(event) => updateDeepFocusDefault(clampNumber(Number(event.target.value), 15, 240))}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">Open-ended tracking</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">Use stopwatch when you want to track the work without preset limits.</p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm leading-6 text-[var(--text-muted)]">{currentQuote}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <PresenceCard
            settings={settings.presence}
            runtime={presenceRuntime}
            streamUrl={presenceStreamUrl}
            canResume={canResumeWithPresence}
            onResume={resumeSession}
          />
        </div>
      </section>

      {immersiveOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[linear-gradient(180deg,#0d0f12_0%,#101514_100%)]">
          <div className="surface-grid min-h-screen px-4 py-5 md:px-8 md:py-6">
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

            <div className="mx-auto mt-6 max-w-[980px]">
              <TimerCard
                mode="deep-focus"
                activeSession={activeSession}
                displayMs={displayMs}
                elapsedMs={elapsedMs}
                progress={progress}
                immersive
                statusLabel={timerStatusLabel}
                focusStateLabel={focusStateLabel ?? "Immersive"}
                warning={presenceRuntime.isRecoveryCountdownActive}
              />
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <TimerControls
                  activeSession={activeSession}
                  onStart={() => {
                    void primePresenceAlarmAudio();
                    startSession("deep-focus");
                  }}
                  onPause={pauseSession}
                  onResume={() => {
                    void primePresenceAlarmAudio();
                    resumeSession();
                  }}
                  onReset={() => {
                    if (activeSession) {
                      resetSession();
                    } else {
                      setQuickNote("");
                    }
                  }}
                  onStop={stopSession}
                  onSkipBreak={skipBreak}
                  startDisabled={!canStartWithPresence}
                  resumeDisabled={!canResumeWithPresence}
                  startLabel="Start session"
                  resumeLabel={presenceRuntime.awaitingManualResume ? "Resume focus" : "Resume"}
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
        onDismiss={dismissCompletion}
        onNoteChange={updateCompletionNote}
      />
    </>
  );
}
