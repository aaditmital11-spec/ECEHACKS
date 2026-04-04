# LockedIn Backend Dashboard

This project is now a backend-first presence monitoring app.

- Python backend handles face presence checks and absence countdown logic.
- Next.js frontend is a thin dashboard that controls and displays backend state.

## Current Architecture

- `facial.py`: Face detection and `is_user_present()` callable.
- `timer_logic.py`: Presence timer state (`time_present`, absence start, countdown, alert condition).
- `backend_api.py`: FastAPI server exposing runtime control and status endpoints.
- `backend_main.py`: Optional local loop runner (CLI-style backend runner).
- `src/app/page.tsx`: Minimal frontend dashboard that calls backend API.

## API Endpoints

- `GET /health`: Health check.
- `GET /status`: Current backend runtime state.
- `POST /start`: Start background polling loop.
- `POST /stop`: Stop polling loop and release camera.
- `POST /config`: Update poll interval and absence timeout.

## Setup

### 1. Python backend

Install Python dependencies:

```bash
pip install -r requirements-backend.txt
```

Start backend API:

```bash
python backend_api.py
```

Backend runs at `http://127.0.0.1:8000`.

### 2. Next.js frontend

Install Node dependencies:

```bash
npm install
```

Start frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Frontend-Backend Connection

The frontend reads `NEXT_PUBLIC_BACKEND_URL` and defaults to:

`http://127.0.0.1:8000`

Set a custom URL before running dev server if needed:

```bash
set NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

## Notes

- Keep webcam access free for the backend process.
- Use the dashboard buttons to start/stop backend polling.
- `backend_main.py` can still be used for direct backend-only testing.

## Project Files Explained

These root files are expected and should generally be kept:

- `package.json`: Node project manifest. Defines scripts (`dev`, `build`, `start`, `lint`) and dependencies.
- `package-lock.json`: Exact dependency lockfile so installs are reproducible across machines.
- `tsconfig.json`: TypeScript compiler settings used by Next.js.
- `next.config.ts`: Next.js configuration file.
- `next-env.d.ts`: Auto-generated Next.js TypeScript type declarations.
- `postcss.config.mjs`: PostCSS config used by Tailwind/CSS processing.
- `eslint.config.mjs`: ESLint configuration for code quality checks.
- `.gitignore`: Files/folders Git should not track (build artifacts, dependencies, caches).

Can these be removed?

- Usually no, not for an active Next.js + TypeScript project.
- `package-lock.json` should be committed so installs remain consistent.
- `next-env.d.ts` is auto-generated; keep it in the project.
- You would only remove TypeScript files/configs (`tsconfig.json`, `next-env.d.ts`) if you intentionally migrate to plain JavaScript.
