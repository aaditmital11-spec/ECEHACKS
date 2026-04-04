from __future__ import annotations

import time
from datetime import datetime
from typing import Callable

from timer_logic import PresenceTimer


def get_presence_checker() -> Callable[[], bool]:
    # Import locally so the backend can start even if facial setup is heavy.
    import facial

    # Support a few common function names; first match wins.
    for name in ("is_user_present", "is_present", "check_presence", "get_presence"):
        fn = getattr(facial, name, None)
        if callable(fn):
            return fn

    raise AttributeError(
        "No callable presence function found in facial.py. "
        "Expected one of: is_user_present, is_present, check_presence, get_presence."
    )


def alert_user(timer: PresenceTimer) -> None:
    print(
        f"[ALERT] User absent too long. "
        f"Last seen: {timer.time_present.isoformat() if timer.time_present else 'never'}"
    )


def run_backend(
    poll_interval_seconds: float = 1.0,
    absence_timeout_seconds: int = 30,
) -> None:
    # Import here so we can call release_camera() during shutdown cleanup.
    import facial

    check_presence = get_presence_checker()
    timer = PresenceTimer(absence_timeout_seconds=absence_timeout_seconds)

    print(
        f"Backend started. Poll={poll_interval_seconds}s, "
        f"absence alert after {absence_timeout_seconds}s."
    )

    try:
        while True:
            now = datetime.now()
            # One polling cycle: ask facial recognition for current presence.
            present = bool(check_presence())

            if present:
                # User seen now -> refresh last-present timestamp and clear absence tracking.
                timer.mark_present(now)
                print(f"[{now.isoformat(timespec='seconds')}] Present. time_present updated.")
            else:
                # User missing -> start/continue countdown to absence alert.
                timer.mark_absent(now)
                seconds_left = timer.seconds_until_alert(now)
                print(
                    f"[{now.isoformat(timespec='seconds')}] Absent. "
                    f"Alert countdown: {seconds_left}s."
                )
                # Fire alert once countdown reaches zero.
                if timer.should_alert(now):
                    alert_user(timer)

            # Wait before next poll.
            time.sleep(poll_interval_seconds)
    except KeyboardInterrupt:
        print("Backend stopped by user.")
    finally:
        # Always release the camera when backend exits.
        release_fn = getattr(facial, "release_camera", None)
        if callable(release_fn):
            release_fn()


if __name__ == "__main__":
    run_backend()
