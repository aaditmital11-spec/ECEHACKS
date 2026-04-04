"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Camera, CircleDot, LoaderCircle, RotateCcw, ShieldCheck, UserRoundX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDuration, formatSecondsLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AppSettings, PresenceRuntimeState } from "@/types/app";

function getStatusCopy(settingsEnabled: boolean, runtime: PresenceRuntimeState) {
  if (!settingsEnabled) {
    return { label: "Disabled", tone: "idle" as const, detail: "Presence-aware focus mode is turned off." };
  }

  if (runtime.serviceStatus === "connecting" || runtime.cameraStatus === "connecting") {
    return { label: "Connecting", tone: "pending" as const, detail: "Connecting to the local camera service." };
  }

  if (runtime.serviceStatus === "error" || runtime.cameraStatus === "error" || runtime.serviceStatus === "offline") {
    return { label: "Error", tone: "danger" as const, detail: runtime.serviceError ?? "The local presence service is unavailable." };
  }

  if (runtime.isRecoveryCountdownActive) {
    return { label: "Recovery", tone: "warning" as const, detail: "Focus lock was broken. Return before the recovery timer ends." };
  }

  if (runtime.isPresent) {
    return { label: "Present", tone: "success" as const, detail: "Presence confirmed. The session can continue normally." };
  }

  return { label: "Away", tone: "warning" as const, detail: "Away detected. The timer will pause after the configured threshold." };
}

export function PresenceCard({
  settings,
  runtime,
  streamUrl,
  canResume,
  onResume,
}: {
  settings: AppSettings["presence"];
  runtime: PresenceRuntimeState;
  streamUrl: string;
  canResume: boolean;
  onResume: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const status = useMemo(() => getStatusCopy(settings.enabled, runtime), [runtime, settings.enabled]);

  return (
    <div
      className={cn(
        "rounded-[30px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] p-4 transition-colors",
        status.tone === "success" && "border-[rgba(101,211,138,0.24)]",
        status.tone === "pending" && "border-[rgba(255,255,255,0.1)]",
        status.tone === "warning" && "border-[rgba(255,190,92,0.34)]",
        status.tone === "danger" && "border-[rgba(255,135,110,0.32)]",
        status.tone === "idle" && "border-[var(--border)]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Presence</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text)]">Focus lock</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">{status.detail}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
            status.tone === "success" && "border-[rgba(101,211,138,0.28)] bg-[rgba(101,211,138,0.12)] text-[var(--text)]",
            status.tone === "pending" && "border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]",
            status.tone === "warning" && "border-[rgba(255,190,92,0.3)] bg-[rgba(255,190,92,0.12)] text-[var(--text)]",
            status.tone === "danger" && "border-[rgba(255,135,110,0.28)] bg-[rgba(255,135,110,0.12)] text-[var(--text)]",
            status.tone === "idle" && "border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)]",
          )}
        >
          {status.tone === "success" ? (
            <ShieldCheck className="size-3.5" />
          ) : status.tone === "pending" ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : status.tone === "danger" ? (
            <AlertTriangle className="size-3.5" />
          ) : status.tone === "warning" ? (
            <UserRoundX className="size-3.5" />
          ) : (
            <CircleDot className="size-3.5" />
          )}
          {status.label}
        </span>
      </div>

      {settings.cameraPanelVisible ? (
        <div className="mt-4 overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,12,16,0.9)]">
          {!imageError && runtime.previewAvailable && runtime.serviceStatus === "ready" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Live presence preview"
              className="aspect-[5/4] w-full object-cover"
              src={streamUrl}
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
          ) : (
            <div className="flex aspect-[5/4] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,160,118,0.18),transparent_60%)]">
              <div className="text-center">
                <Camera className="mx-auto size-8 text-[var(--text-subtle)]" />
                <p className="mt-3 text-sm font-medium text-[var(--text)]">Preview unavailable</p>
                <p className="mt-2 max-w-[220px] text-sm leading-6 text-[var(--text-muted)]">
                  Start the local service to stream camera frames into the timer workspace.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-[24px] border border-dashed border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
          <p className="text-sm font-medium text-[var(--text)]">Preview hidden</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Presence monitoring is still active. Turn the camera panel back on in settings if you want the live preview here.
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-subtle)]">Away threshold</p>
          <p className="mt-2 text-sm font-medium text-[var(--text)]">{formatSecondsLabel(settings.minimumAbsenceSec)}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {runtime.isPresent ? "Presence refreshed continuously." : `Away for ${formatDuration(runtime.absentDurationMs)}`}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-subtle)]">Recovery window</p>
          <p className="mt-2 text-sm font-medium text-[var(--text)]">
            {runtime.isRecoveryCountdownActive
              ? formatDuration(runtime.recoveryTimeRemainingMs)
              : formatSecondsLabel(settings.recoveryDurationSec)}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {runtime.isRecoveryCountdownActive
              ? "Return before the side timer reaches zero."
              : "Starts only after the absence threshold is crossed."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-subtle)]">Camera</p>
          <p className="mt-2 text-sm font-medium capitalize text-[var(--text)]">{runtime.cameraStatus}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-subtle)]">Alarm</p>
          <p className="mt-2 text-sm font-medium text-[var(--text)]">
            {settings.alarmEnabled ? (runtime.isAlarmPlaying ? "Playing" : "Armed") : "Muted"}
          </p>
        </div>
      </div>

      {runtime.awaitingManualResume ? (
        <div className="mt-4 rounded-[24px] border border-[rgba(101,211,138,0.24)] bg-[rgba(101,211,138,0.08)] p-4">
          <p className="text-sm font-medium text-[var(--text)]">Presence recovered.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            The session is paused and ready to continue. Resume manually when you are settled back in.
          </p>
          <Button className="mt-4" disabled={!canResume} onClick={onResume}>
            <RotateCcw className="size-4" />
            Resume session
          </Button>
        </div>
      ) : null}

      {runtime.sessionFailureReason === "extended-absence" ? (
        <div className="mt-4 rounded-[24px] border border-[rgba(255,190,92,0.28)] bg-[rgba(255,190,92,0.1)] p-4">
          <p className="text-sm font-medium text-[var(--text)]">Session reset due to extended absence.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            The interrupted session was logged and the timer is back at zero. Start again when you are ready.
          </p>
        </div>
      ) : null}

      {runtime.serviceStatus !== "ready" ? (
        <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <p className="text-sm font-medium text-[var(--text)]">Run the local presence service</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Use <code>python presence_service.py</code> from the project root, then refresh this page if the preview does not
            reconnect automatically.
          </p>
        </div>
      ) : null}
    </div>
  );
}
