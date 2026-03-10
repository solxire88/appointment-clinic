# Runbook: Static Next.js + Django API

## 1) Backend

1. Prepare environment:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   ```
2. Set required variables in `.env`:
   - `DATABASE_URL`
   - `DJANGO_SECRET_KEY`
   - `FRONTEND_ORIGIN`
   - `JWT_SECRET`
3. Start API:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

## 2) Frontend

1. Configure API origin:
   ```bash
   cd frontend
   cp .env.example .env
   ```
   Set `NEXT_PUBLIC_API_BASE_URL` to Django origin (example `http://localhost:8000`).
2. Run dev:
   ```bash
   pnpm install
   pnpm dev
   ```
3. Build static export:
   ```bash
   pnpm build
   ```

## 3) Production Deployment Pattern

1. Build and host static frontend output from Next export.
2. Deploy Django API separately under `api.<domain>` (same site family as frontend).
3. Set `NEXT_PUBLIC_API_BASE_URL` to that API origin.
4. Ensure CORS `FRONTEND_ORIGIN` includes frontend origin.

## 4) Smoke Checks

1. Public: services, doctors, availability, booking create, ticket fetch.
2. Admin auth: login, session check, logout.
3. Admin CRUD: services, doctors, appointments.
4. Waiting room: call-next/call-specific updates display.
5. Display polling: changed/unchanged behavior with `since`.
6. Videos: upload, list/reorder/toggle/delete, and byte-range playback.
