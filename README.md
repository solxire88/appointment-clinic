# Clinic Appointment Backend

This repository contains the backend for a bilingual clinic appointment + waiting-room system. The frontend already exists. The backend is implemented with Next.js App Router route handlers, Prisma (MariaDB), NextAuth Credentials, and Zod.

## Stack
- Next.js App Router API route handlers (`app/api/**/route.ts`)
- TypeScript
- Prisma + MariaDB
- NextAuth (Credentials) for admin authentication
- Zod for request validation
- Local filesystem video storage (`uploads/videos`)

## Setup
1. Install dependencies.
2. Create a MariaDB database and set `DATABASE_URL`.
3. Set `NEXTAUTH_URL` and `NEXTAUTH_SECRET`.
4. Seed the database to create the admin user and `DisplayState` singleton.

```bash
pnpm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
pnpm dev
```

For production deployments:

```bash
npx prisma migrate deploy
```

## Environment Variables
See `.env.example`.
```
DATABASE_URL="mysql://user:pass@host:3306/dbname"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
ADMIN_EMAIL="..."
ADMIN_PASSWORD="..."
MAX_VIDEO_MB="100" # optional, defaults to 100
```

## Notes
- Clinic timezone: `Africa/Algiers`.
- `appointmentDate` is stored as a DateTime set to 00:00 for the local date.
- Public booking rejects dates in the past (relative to Africa/Algiers).
- Capacity checks count all appointments except `NO_SHOW`.
- Video uploads are stored on the local filesystem in `uploads/videos`.
  - Ensure this path is persisted (shared hosting/VPS should mount a persistent disk).
  - `/api/videos/file/:id` streams files with HTTP Range support.

## API Overview
Public:
- `GET /api/public/services`
- `GET /api/public/doctors`
- `GET /api/public/availability`
- `POST /api/appointments`
- `GET /api/appointments/:id`
- `GET /api/display`
- `GET /api/videos`
- `GET /api/videos/file/:id`

Admin (NextAuth Credentials):
- `GET/POST /api/admin/services`
- `PATCH/DELETE /api/admin/services/:id`
- `GET/POST /api/admin/doctors`
- `PATCH/DELETE /api/admin/doctors/:id`
- `GET/POST /api/admin/appointments`
- `PATCH/DELETE /api/admin/appointments/:id`
- `GET /api/admin/stats`
- `POST /api/admin/waiting-room/call-next`
- `POST /api/admin/waiting-room/call-specific`
- `POST /api/admin/display`
- `GET /api/admin/videos`
- `POST /api/admin/videos/upload`
- `PATCH/DELETE /api/admin/videos/:id`
- `POST /api/admin/videos/reorder`
