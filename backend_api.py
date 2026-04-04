from __future__ import annotations

import threading
from datetime import datetime, timedelta
from typing import Any, Dict, Literal, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import facial
from timer_logic import PresenceTimer

SessionMode = Literal["chill", "regular", "exams", "custom"]
SessionPhase = Literal["study", "break"]


class RuntimeConfig(BaseModel):
    poll_interval_seconds: float = Field(default=1.0, ge=0.2, le=5.0)
    absence_timeout_seconds: int = Field(default=30, ge=5, le=300)
    study_duration_seconds: int = Field(default=3600, ge=300, le=14400)
    break_duration_seconds: int = Field(default=1800, ge=60, le=3600)
    bathroom_break_seconds: int = Field(default=300, ge=60, le=3600)


class StartSessionPayload(BaseModel):
    mode: SessionMode = "custom"


class ConfigPayload(BaseModel):
    poll_interval_seconds: float = Field(default=1.0, ge=0.2, le=5.0)
    absence_timeout_seconds: int = Field(default=30, ge=5, le=300)
    study_duration_seconds: int = Field(default=3600, ge=300, le=14400)
    break_duration_seconds: int = Field(default=1800, ge=60, le=3600)
    bathroom_break_seconds: int = Field(default=300, ge=60, le=3600)


class BackendRuntime:
    MAX_ACTIVE_SESSION_SECONDS = 10 * 60 * 60

    def __init__(self) -> None:
        self._config = RuntimeConfig()
        self._presence_timer = PresenceTimer(absence_timeout_seconds=self._config.absence_timeout_seconds)

        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        self._running = False
        self._present = False
        self._alert_active = False
        self._last_check_at: Optional[datetime] = None
        self._last_error: Optional[str] = None

        self._session_active = False
        self._session_mode: SessionMode = "custom"
        self._session_phase: SessionPhase = "study"
        self._session_started_at: Optional[datetime] = None
        self._session_total_active_seconds = 0.0
        self._session_phase_elapsed_seconds = 0.0
        self._manual_paused = False
        self._bathroom_break_until: Optional[datetime] = None
        self._session_ended_reason: Optional[str] = None

        self._last_tick_at = datetime.now()

    def start_runtime(self) -> bool:
        with self._lock:
            if self._running:
                return False
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._loop, daemon=True, name="study-runtime")
            self._running = True
            self._last_tick_at = datetime.now()
            self._thread.start()
            return True

    def stop_runtime(self) -> bool:
        with self._lock:
            if not self._running:
                return False
            self._stop_event.set()
            thread = self._thread

        if thread is not None:
            thread.join(timeout=2.0)

        with self._lock:
            self._running = False
            self._thread = None

        facial.release_camera()
        return True

    def start_session(self, mode: SessionMode) -> bool:
        self.start_runtime()
        with self._lock:
            if self._session_active:
                return False

            self._session_active = True
            self._session_mode = mode
            self._session_phase = "study"
            self._session_started_at = datetime.now()
            self._session_total_active_seconds = 0.0
            self._session_phase_elapsed_seconds = 0.0
            self._manual_paused = False
            self._bathroom_break_until = None
            self._session_ended_reason = None
            self._last_tick_at = datetime.now()
            return True

    def stop_session(self, reason: str = "stopped_by_user") -> bool:
        with self._lock:
            if not self._session_active:
                return False
            self._session_active = False
            # Reset timer display immediately to the beginning of study phase.
            self._session_phase = "study"
            self._session_phase_elapsed_seconds = 0.0
            self._session_total_active_seconds = 0.0
            self._manual_paused = False
            self._bathroom_break_until = None
            self._session_ended_reason = reason
            self._alert_active = False
            self._presence_timer.absence_started_at = None
            return True

    def pause_session(self) -> bool:
        with self._lock:
            if not self._session_active:
                return False
            self._manual_paused = True
            self._alert_active = False
            self._presence_timer.absence_started_at = None
            return True

    def resume_session(self) -> bool:
        with self._lock:
            if not self._session_active:
                return False
            self._manual_paused = False
            self._last_tick_at = datetime.now()
            return True

    def start_bathroom_break(self) -> bool:
        with self._lock:
            if not self._session_active:
                return False
            self._bathroom_break_until = datetime.now() + timedelta(seconds=self._config.bathroom_break_seconds)
            self._alert_active = False
            self._presence_timer.absence_started_at = None
            return True

    def cancel_bathroom_break(self) -> bool:
        with self._lock:
            if self._bathroom_break_until is None:
                return False
            self._bathroom_break_until = None
            return True

    def update_config(self, cfg: RuntimeConfig) -> RuntimeConfig:
        with self._lock:
            self._config = cfg
            self._presence_timer.absence_timeout_seconds = cfg.absence_timeout_seconds
        return cfg

    def _current_phase_duration_seconds(self) -> int:
        return (
            self._config.study_duration_seconds
            if self._session_phase == "study"
            else self._config.break_duration_seconds
        )

    def _is_bathroom_break_active(self, now: datetime) -> bool:
        if self._bathroom_break_until is None:
            return False
        if now >= self._bathroom_break_until:
            self._bathroom_break_until = None
            return False
        return True

    def _advance_session(self, now: datetime) -> None:
        delta = (now - self._last_tick_at).total_seconds()
        self._last_tick_at = now

        if delta <= 0 or not self._session_active:
            return

        bathroom_active = self._is_bathroom_break_active(now)
        effective_paused = self._manual_paused or bathroom_active
        if effective_paused:
            return

        self._session_total_active_seconds += delta
        if self._session_total_active_seconds >= self.MAX_ACTIVE_SESSION_SECONDS:
            self._session_total_active_seconds = float(self.MAX_ACTIVE_SESSION_SECONDS)
            self._session_active = False
            self._manual_paused = False
            self._bathroom_break_until = None
            self._session_ended_reason = "max_10_hours_reached"
            self._alert_active = False
            self._presence_timer.absence_started_at = None
            return

        self._session_phase_elapsed_seconds += delta
        while self._session_phase_elapsed_seconds >= self._current_phase_duration_seconds():
            self._session_phase_elapsed_seconds -= self._current_phase_duration_seconds()
            self._session_phase = "break" if self._session_phase == "study" else "study"

    def _should_track_absence(self, now: datetime) -> bool:
        if not self._session_active:
            return False
        if self._manual_paused:
            return False
        if self._is_bathroom_break_active(now):
            return False
        return True

    def _loop(self) -> None:
        while not self._stop_event.is_set():
            now = datetime.now()
            try:
                present = bool(facial.is_user_present())
                with self._lock:
                    self._advance_session(now)

                    self._present = present
                    self._last_check_at = now
                    self._last_error = None

                    if present:
                        self._presence_timer.mark_present(now)
                        self._alert_active = False
                    else:
                        if self._should_track_absence(now):
                            self._presence_timer.mark_absent(now)
                            self._alert_active = self._presence_timer.should_alert(now)
                        else:
                            self._presence_timer.absence_started_at = None
                            self._alert_active = False
            except Exception as exc:  # noqa: BLE001
                with self._lock:
                    self._last_error = str(exc)
                    self._last_check_at = now

            with self._lock:
                poll_interval = self._config.poll_interval_seconds

            self._stop_event.wait(timeout=poll_interval)

        facial.release_camera()

    def status(self) -> Dict[str, Any]:
        with self._lock:
            now = datetime.now()
            bathroom_active = self._is_bathroom_break_active(now)
            phase_duration = self._current_phase_duration_seconds()
            phase_remaining = max(0, int(phase_duration - self._session_phase_elapsed_seconds))
            bathroom_seconds_left = (
                max(0, int((self._bathroom_break_until - now).total_seconds()))
                if self._bathroom_break_until
                else 0
            )

            return {
                "running": self._running,
                "present": self._present,
                "alert_active": self._alert_active,
                "time_present": self._presence_timer.time_present.isoformat() if self._presence_timer.time_present else None,
                "absence_started_at": self._presence_timer.absence_started_at.isoformat()
                if self._presence_timer.absence_started_at
                else None,
                "seconds_until_alert": self._presence_timer.seconds_until_alert(now),
                "last_check_at": self._last_check_at.isoformat() if self._last_check_at else None,
                "last_error": self._last_error,
                "config": self._config.model_dump(),
                "session": {
                    "active": self._session_active,
                    "mode": self._session_mode,
                    "phase": self._session_phase,
                    "manual_paused": self._manual_paused,
                    "bathroom_break_active": bathroom_active,
                    "bathroom_seconds_left": bathroom_seconds_left,
                    "phase_remaining_seconds": phase_remaining,
                    "total_active_seconds": int(self._session_total_active_seconds),
                    "max_session_seconds": self.MAX_ACTIVE_SESSION_SECONDS,
                    "started_at": self._session_started_at.isoformat() if self._session_started_at else None,
                    "ended_reason": self._session_ended_reason,
                },
            }


runtime = BackendRuntime()

app = FastAPI(title="Focus Session Backend API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/status")
def get_status() -> Dict[str, Any]:
    return runtime.status()


@app.post("/start")
def start_runtime() -> Dict[str, Any]:
    started = runtime.start_runtime()
    return {"started": started, "status": runtime.status()}


@app.post("/stop")
def stop_runtime() -> Dict[str, Any]:
    stopped = runtime.stop_runtime()
    return {"stopped": stopped, "status": runtime.status()}


@app.post("/config")
def set_config(payload: ConfigPayload) -> Dict[str, Any]:
    cfg = RuntimeConfig(**payload.model_dump())
    runtime.update_config(cfg)
    return {"updated": True, "status": runtime.status()}


@app.post("/session/start")
def session_start(payload: StartSessionPayload) -> Dict[str, Any]:
    started = runtime.start_session(payload.mode)
    return {"started": started, "status": runtime.status()}


@app.post("/session/stop")
def session_stop() -> Dict[str, Any]:
    stopped = runtime.stop_session("stopped_by_user")
    return {"stopped": stopped, "status": runtime.status()}


@app.post("/session/pause")
def session_pause() -> Dict[str, Any]:
    paused = runtime.pause_session()
    return {"paused": paused, "status": runtime.status()}


@app.post("/session/resume")
def session_resume() -> Dict[str, Any]:
    resumed = runtime.resume_session()
    return {"resumed": resumed, "status": runtime.status()}


@app.post("/bathroom-break/start")
def bathroom_break_start() -> Dict[str, Any]:
    started = runtime.start_bathroom_break()
    return {"started": started, "status": runtime.status()}


@app.post("/bathroom-break/cancel")
def bathroom_break_cancel() -> Dict[str, Any]:
    cancelled = runtime.cancel_bathroom_break()
    return {"cancelled": cancelled, "status": runtime.status()}


@app.on_event("shutdown")
def on_shutdown() -> None:
    runtime.stop_runtime()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend_api:app", host="127.0.0.1", port=8000, reload=False)
