"use client";

import { Download, RotateCcw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PresenceSettingsCard } from "@/components/settings/presence-settings-card";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { BathroomBreakCard } from "@/components/timer/bathroom-break-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBathroomBreak } from "@/hooks/use-bathroom-break";
import { studyPresets } from "@/lib/constants";
import { appThemes } from "@/types/app";
import { useAppStore } from "@/store/app-store";

function downloadSessions(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lockedin-sessions-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const settings = useAppStore((state) => state.settings);
  const sessions = useAppStore((state) => state.sessions);
  const todos = useAppStore((state) => state.todos);
  const setTheme = useAppStore((state) => state.setTheme);
  const setDefaultMode = useAppStore((state) => state.setDefaultMode);
  const updatePomodoroDefaults = useAppStore((state) => state.updatePomodoroDefaults);
  const updateCountdownDefault = useAppStore((state) => state.updateCountdownDefault);
  const updateDeepFocusDefault = useAppStore((state) => state.updateDeepFocusDefault);
  const setBathroomBreakDurationSec = useAppStore((state) => state.setBathroomBreakDurationSec);
  const setAbsenceAlertThresholdSec = useAppStore((state) => state.setAbsenceAlertThresholdSec);
  const updatePresenceSettings = useAppStore((state) => state.updatePresenceSettings);
  const setToggleSetting = useAppStore((state) => state.setToggleSetting);
  const resetAllData = useAppStore((state) => state.resetAllData);
  const { activeBathroomBreak, remainingMs, startBathroomBreak, cancelBathroomBreak } = useBathroomBreak();

  if (!hydrated) {
    return <div className="h-[480px] rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />;
  }

  async function handleNotificationToggle(checked: boolean) {
    if (checked && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    setToggleSetting("notificationsEnabled", checked);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SettingsPanel title="Timer defaults" description="Default values used when starting new sessions.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
            {studyPresets.map((preset) => (
              <div key={preset.id} className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="text-sm font-medium text-[var(--text)]">{preset.label}</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {preset.focusMin}m study, {preset.breakMin}m break
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text)]" htmlFor="long-break">
              Long break
            </label>
            <Input
              id="long-break"
              type="number"
              min={5}
              max={60}
              value={settings.timerDefaults.pomodoro.longBreakDurationMin}
              onChange={(event) => updatePomodoroDefaults({ longBreakDurationMin: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text)]" htmlFor="cycle-count">
              Cycles before long break
            </label>
            <Input
              id="cycle-count"
              type="number"
              min={2}
              max={8}
              value={settings.timerDefaults.pomodoro.cyclesBeforeLongBreak}
              onChange={(event) => updatePomodoroDefaults({ cyclesBeforeLongBreak: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text)]" htmlFor="countdown-default">
              Countdown duration
            </label>
            <Input
              id="countdown-default"
              type="number"
              min={5}
              max={240}
              value={settings.timerDefaults.countdown.durationMin}
              onChange={(event) => updateCountdownDefault(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text)]" htmlFor="deep-focus-default">
              Deep Focus duration
            </label>
            <Input
              id="deep-focus-default"
              type="number"
              min={15}
              max={240}
              value={settings.timerDefaults.deepFocusDurationMin}
              onChange={(event) => updateDeepFocusDefault(Number(event.target.value))}
            />
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Experience" description="Keep the product calm, readable, and predictable.">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Sound</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Play a short completion sound when a session ends.</p>
            </div>
            <Switch checked={settings.soundEnabled} onCheckedChange={(checked) => setToggleSetting("soundEnabled", checked)} />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Notifications</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Allow browser reminders for completed sessions.</p>
            </div>
            <Switch checked={settings.notificationsEnabled} onCheckedChange={handleNotificationToggle} />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Reduce motion</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Minimize transitions and movement across the app.</p>
            </div>
            <Switch checked={settings.reduceMotion} onCheckedChange={(checked) => setToggleSetting("reduceMotion", checked)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text)]" htmlFor="default-mode">
                Default mode
              </label>
              <Select
                id="default-mode"
                value={settings.defaultMode}
                onChange={(event) => setDefaultMode(event.target.value as typeof settings.defaultMode)}
              >
                <option value="chill">Chill</option>
                <option value="regular">Regular</option>
                <option value="exams">Exams</option>
                <option value="countdown">Countdown</option>
                <option value="stopwatch">Stopwatch</option>
                <option value="deep-focus">Deep Focus</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text)]" htmlFor="theme">
                Theme
              </label>
              <Select id="theme" value={settings.theme} onChange={(event) => setTheme(event.target.value as (typeof appThemes)[number])}>
                <option value="graphite">Graphite</option>
                <option value="midnight">Midnight</option>
                <option value="sage">Sage</option>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Auto-start next focus phase</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Continue into the next study block automatically after breaks.</p>
            </div>
            <Switch
              checked={settings.timerDefaults.pomodoro.autoStartNextPhase}
              onCheckedChange={(checked) => updatePomodoroDefaults({ autoStartNextPhase: checked })}
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Auto-start study breaks</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Start the scheduled break immediately after a study block ends.</p>
            </div>
            <Switch
              checked={settings.timerDefaults.pomodoro.autoStartBreak}
              onCheckedChange={(checked) => updatePomodoroDefaults({ autoStartBreak: checked })}
            />
          </div>
          <BathroomBreakCard
            breakDurationSec={settings.bathroomBreakDurationSec}
            absenceAlertThresholdSec={settings.absenceAlertThresholdSec}
            activeBathroomBreak={activeBathroomBreak}
            remainingMs={remainingMs}
            onBreakDurationChange={setBathroomBreakDurationSec}
            onThresholdChange={setAbsenceAlertThresholdSec}
            onStart={startBathroomBreak}
            onCancel={cancelBathroomBreak}
          />
          <PresenceSettingsCard settings={settings.presence} onChange={updatePresenceSettings} />
        </div>
      </SettingsPanel>

      <SettingsPanel title="Data" description="Local-first persistence for the MVP.">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <p className="text-sm font-medium text-[var(--text)]">Export session history</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Session history is stored in local storage for the MVP. Export gives you a JSON snapshot that can back a
              future sync or import flow.
            </p>
            <Button className="mt-4" variant="secondary" onClick={() => downloadSessions({ settings, sessions, todos })}>
              <Download className="size-4" />
              Export JSON
            </Button>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="danger">
                <RotateCcw className="size-4" />
                Reset all data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all local data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears settings, active timer state, and saved session history from this device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="danger" onClick={() => resetAllData()}>
                    Reset data
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SettingsPanel>
    </div>
  );
}
