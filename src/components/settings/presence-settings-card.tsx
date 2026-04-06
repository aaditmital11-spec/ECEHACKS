"use client";

import { useState } from "react";
import { Camera, Siren, Timer, UserRoundCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { previewPresenceAlarm, primePresenceAlarmAudio } from "@/lib/presence-alarm";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatSecondsLabel } from "@/lib/time";
import type { AppSettings } from "@/types/app";

export function PresenceSettingsCard({
  settings,
  onChange,
}: {
  settings: AppSettings["presence"];
  onChange: (patch: Partial<AppSettings["presence"]>) => void;
}) {
  const [testingAlarm, setTestingAlarm] = useState(false);

  async function handleTestAlarm() {
    setTestingAlarm(true);
    try {
      await previewPresenceAlarm();
    } finally {
      window.setTimeout(() => setTestingAlarm(false), 500);
    }
  }

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,152,102,0.14)] px-3 py-1.5 text-xs font-medium text-[var(--text)]">
            <UserRoundCheck className="size-3.5" />
            Presence-aware focus mode
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Connect the local CV service, watch for confirmed absence, then pause and protect the session with a recovery
            window before reset.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Enabled</p>
            <p className="text-xs text-[var(--text-subtle)]">Applies while a focus session is active.</p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => {
              if (checked) {
                void primePresenceAlarmAudio();
              }
              onChange({ enabled: checked });
            }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
              <Timer className="size-4 text-[var(--accent)]" />
              Minimum absence
            </div>
            <span className="text-sm text-[var(--text-muted)]">{formatSecondsLabel(settings.minimumAbsenceSec)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Short misses only update the status. Crossing this threshold pauses the main timer and starts recovery.
          </p>
          <Slider
            className="mt-4"
            min={5}
            max={180}
            step={5}
            value={settings.minimumAbsenceSec}
            onChange={(event) => onChange({ minimumAbsenceSec: Number(event.target.value) })}
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
              <Timer className="size-4 text-[var(--accent)]" />
              Recovery countdown
            </div>
            <span className="text-sm text-[var(--text-muted)]">{formatSecondsLabel(settings.recoveryDurationSec)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            This side timer starts once the absence threshold is crossed. If it reaches zero, the session is reset.
          </p>
          <Slider
            className="mt-4"
            min={15}
            max={180}
            step={5}
            value={settings.recoveryDurationSec}
            onChange={(event) => onChange({ recoveryDurationSec: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
              <Siren className="size-4 text-[var(--accent)]" />
              Alarm
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Beeps repeat until you are back on camera <span className="text-[var(--text)]">or</span> the ring duration
              ends—whichever happens first (default 10s).
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                <span>Max ring time</span>
                <span>{formatSecondsLabel(settings.alarmDurationSec)}</span>
              </div>
              <Slider
                min={5}
                max={60}
                step={5}
                value={settings.alarmDurationSec}
                onChange={(event) => onChange({ alarmDurationSec: Number(event.target.value) })}
              />
              <p className="text-xs text-[var(--text-subtle)]">Set to 10s for “10 seconds or until I’m back.”</p>
            </div>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => void handleTestAlarm()}>
              {testingAlarm ? "Testing..." : "Test alarm"}
            </Button>
          </div>
          <Switch
            checked={settings.alarmEnabled}
            onCheckedChange={(checked) => {
              if (checked) {
                void primePresenceAlarmAudio();
              }
              onChange({ alarmEnabled: checked });
            }}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
              <Camera className="size-4 text-[var(--accent)]" />
              Camera panel
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Keep the live preview visible in the timer workspace.</p>
          </div>
          <Switch
            checked={settings.cameraPanelVisible}
            onCheckedChange={(checked) => onChange({ cameraPanelVisible: checked })}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
              <UserRoundCheck className="size-4 text-[var(--accent)]" />
              Auto-resume
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Resume immediately when presence returns instead of waiting for a click.</p>
          </div>
          <Switch checked={settings.autoResume} onCheckedChange={(checked) => onChange({ autoResume: checked })} />
        </div>
      </div>
    </div>
  );
}
