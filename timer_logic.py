from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class PresenceTimer:
    # Seconds user can be absent before backend should alert.
    absence_timeout_seconds: int = 30
    # Last known timestamp where user was confirmed present.
    time_present: Optional[datetime] = None
    # Timestamp when an absence streak started.
    absence_started_at: Optional[datetime] = None

    def mark_present(self, current_time: Optional[datetime] = None) -> None:
        now = current_time or datetime.now()
        # Presence resets absence countdown.
        self.time_present = now
        self.absence_started_at = None

    def mark_absent(self, current_time: Optional[datetime] = None) -> None:
        now = current_time or datetime.now()
        # Start absence countdown only once per absence streak.
        if self.absence_started_at is None:
            self.absence_started_at = now

    def seconds_until_alert(self, current_time: Optional[datetime] = None) -> int:
        # If no active absence streak, full timeout remains.
        if self.absence_started_at is None:
            return self.absence_timeout_seconds

        now = current_time or datetime.now()
        elapsed = now - self.absence_started_at
        remaining = timedelta(seconds=self.absence_timeout_seconds) - elapsed
        # Never return negative seconds.
        return max(0, int(remaining.total_seconds()))

    def should_alert(self, current_time: Optional[datetime] = None) -> bool:
        # Alert only when an absence streak exists and countdown reached zero.
        if self.absence_started_at is None:
            return False
        return self.seconds_until_alert(current_time) == 0
