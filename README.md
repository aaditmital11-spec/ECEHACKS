# lockedIn.

`lockedIn.` is a production-minded study timer web app built for students who want structured focus, session history, and grounded analytics without unnecessary clutter.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Zustand for local app state
- localStorage persistence for MVP
- Recharts for analytics
- Framer Motion for restrained landing-page motion
- lucide-react icons
- Radix primitives for accessible dialogs and switches

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To start the Next.js app and the local Python presence service together:

```bash
npm run dev:presence
```

If your Python executable is not available as `python`, you can point the runner at a different binary:

```bash
PYTHON_BIN=python3 npm run dev:presence
```

On Windows PowerShell:

```powershell
$env:PYTHON_BIN=".venv\\Scripts\\python.exe"
npm run dev:presence
```

## Presence-aware focus mode

LockedIn now supports a local presence-aware mode that uses the existing MediaPipe/OpenCV face detector and a lightweight Python service bridge.

### Run the Python presence service

From the project root:

```bash
python presence_service.py
```

Or use the npm alias:

```bash
npm run presence
```

The helper runner will automatically use `.venv/Scripts/python.exe` on Windows or `.venv/bin/python` on macOS/Linux when that virtual environment exists.

The service starts on `http://127.0.0.1:8765` by default and exposes:

- `/status` for live presence JSON
- `/health` for the same status payload
- `/stream.mjpg` for the right-side live camera preview
- `/snapshot.jpg` for a single JPEG frame

If you need a different webcam, use:

```bash
python presence_service.py --camera-index 1
```

You can still run the original OpenCV preview window with:

```bash
python facial.py
```

### How the frontend connects

- The Next.js app polls the local service at `NEXT_PUBLIC_PRESENCE_SERVICE_URL` every second
- If the variable is not set, the frontend uses `http://127.0.0.1:8765`
- The camera card on `/app/timer` renders the live preview directly from `/stream.mjpg`
- Presence runtime state is coordinated globally in `AppEffects`, so session protection keeps working while moving around the app

### Configurable behavior

Presence settings live in the Settings page and include:

- presence-aware mode enabled on or off
- minimum absence threshold in seconds
- recovery countdown duration in seconds
- auto-resume after return
- alarm enabled on or off
- camera panel visible on or off

### Expected absence flow

- While present, the app keeps refreshing the last-seen timestamp and the timer runs normally
- If the user is away but has not crossed the minimum absence threshold, the presence card shows `Away` and keeps counting
- Once the threshold is crossed, LockedIn pauses the main timer, starts the repeating beep pattern, and begins the recovery countdown
- If the user returns before recovery ends, the alarm stops and the session can resume automatically or manually depending on settings
- If recovery reaches zero before presence returns, the timer resets to `00:00`, the active session is marked as interrupted, and the user must start again

## Architecture

- `src/app`: App Router routes for landing, product shell, timer, dashboard, history, and settings
- `src/components`: Reusable UI, shell, timer, dashboard, history, and settings components
- `src/store/app-store.ts`: Persisted Zustand store for settings, sessions, active timer state, and completion drafts
- `src/hooks/use-timer-engine.ts`: Timestamp-based timer engine with Pomodoro phase handling, pause/resume, and completion flow
- `src/hooks/use-presence-monitor.ts`: Global presence coordinator that polls the Python service, manages recovery flow, and interrupts sessions on extended absence
- `src/lib`: Shared utilities for analytics, timer math, time formatting, constants, and class helpers
- `src/types`: Typed models for sessions, settings, themes, and timer modes

## Persistence model

- All MVP data is stored locally through Zustand `persist`
- Saved state includes:
  - settings
  - session history
  - selected mode and subject
  - active timer session
  - pending completion draft
- Timer accuracy is derived from timestamps rather than interval-only counting, so refreshes and tab switches do not break active sessions

## Core product areas

- Landing page with concise product-led messaging
- Timer workspace with Pomodoro, Countdown, Stopwatch, and Deep Focus modes
- Session completion flow with note capture
- Dashboard with today/week totals, streaks, completion rate, average session length, subject breakdowns, mode breakdowns, and daily trend chart
- History page with filters, search, deletion, and clear-all confirmation
- Settings page with timer defaults, theme selection, motion controls, notifications, sound, export, and reset

## Future improvements

- Account sync and cloud backup
- Calendar-aware planning and scheduled study blocks
- Richer exports and import flow
- Shared presets for subject templates
- Optional backend for multi-device continuity and richer reporting
