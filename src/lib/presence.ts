import type { PresenceRuntimeState, PresenceServiceSnapshot } from "@/types/app";

const defaultPresenceServiceUrl = "http://127.0.0.1:8765";

export const presenceServiceUrl =
  process.env.NEXT_PUBLIC_PRESENCE_SERVICE_URL?.replace(/\/$/, "") ?? defaultPresenceServiceUrl;

export const presenceStatusUrl = `${presenceServiceUrl}/status`;
export const presenceStreamUrl = `${presenceServiceUrl}/stream.mjpg`;

export function isPresenceServiceReady(runtime: PresenceRuntimeState) {
  return runtime.serviceStatus === "ready" && runtime.cameraStatus === "streaming";
}

export function isPresenceWarningState(runtime: PresenceRuntimeState) {
  return runtime.isRecoveryCountdownActive || runtime.hasTriggeredAbsenceEvent;
}

export function confidenceToPercent(confidence: number | null) {
  if (confidence === null) {
    return null;
  }

  return Math.round(confidence * 100);
}

export function normalizePresenceSnapshot(input: PresenceServiceSnapshot): PresenceServiceSnapshot {
  return {
    ...input,
    error: input.error ?? null,
    confidence: input.confidence ?? null,
    lastSeenTimestamp: input.lastSeenTimestamp ?? null,
  };
}
