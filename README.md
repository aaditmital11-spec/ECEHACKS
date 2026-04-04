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

## Architecture

- `src/app`: App Router routes for landing, product shell, timer, dashboard, history, and settings
- `src/components`: Reusable UI, shell, timer, dashboard, history, and settings components
- `src/store/app-store.ts`: Persisted Zustand store for settings, sessions, active timer state, and completion drafts
- `src/hooks/use-timer-engine.ts`: Timestamp-based timer engine with Pomodoro phase handling, pause/resume, and completion flow
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
