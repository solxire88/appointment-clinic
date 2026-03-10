# Django Cutover File Log

This file records every file created, modified, deleted, or moved during the Next.js backend to Django cutover.

## Created

- `backend/manage.py`: Django entrypoint.
- `backend/config/__init__.py`: PyMySQL bootstrap (`install_as_MySQLdb`).
- `backend/config/asgi.py`: ASGI app bootstrap.
- `backend/config/wsgi.py`: WSGI app bootstrap.
- `backend/config/settings.py`: Django settings, DB URL parsing, CORS, JWT, media/videos config.
- `backend/config/urls.py`: API URL registration for all apps.
- `backend/requirements.txt`: Python dependencies for Django backend.
- `backend/README.md`: Backend setup and behavior notes.
- `backend/.env.example`: Backend env contract.
- `backend/core/apps.py`: Core app config.
- `backend/core/http.py`: JSON error + JSON body helper.
- `backend/core/timezone_utils.py`: Africa/Algiers date normalization/day range logic.
- `backend/core/schedule.py`: Schedule and slot capacity helpers.
- `backend/core/rate_limit.py`: Sliding-window in-memory rate limiter.
- `backend/core/videos.py`: Video MIME/filename/storage helpers.
- `backend/core/auth.py`: JWT issue/verify and admin route guard.
- `backend/core/ids.py`: CUID-like ID generator.
- `backend/core/validators.py`: Request validation helpers.
- `backend/clinic/apps.py`: Clinic app config.
- `backend/clinic/models.py`: Unmanaged model mapping to existing MariaDB tables.
- `backend/clinic/formatters.py`: Service/Doctor API serializer helpers.
- `backend/clinic/urls.py`: Service/Doctor public + admin routes.
- `backend/clinic/views.py`: Service/Doctor public/admin CRUD and cascade delete behavior.
- `backend/appointments/apps.py`: Appointments app config.
- `backend/appointments/formatters.py`: Appointment serializer helpers.
- `backend/appointments/urls.py`: Availability, appointments, stats, waiting-room routes.
- `backend/appointments/views.py`: Booking, admin appointments, stats, waiting-room call logic.
- `backend/display/apps.py`: Display app config.
- `backend/display/urls.py`: Public/admin display routes.
- `backend/display/views.py`: Display polling payload and admin display control.
- `backend/videos/apps.py`: Videos app config.
- `backend/videos/urls.py`: Public/admin video routes.
- `backend/videos/views.py`: Playlist, upload, patch/delete, reorder, range streaming.
- `backend/auth_api/apps.py`: Auth app config.
- `backend/auth_api/urls.py`: Auth endpoint routes.
- `backend/auth_api/views.py`: JWT login/session/logout endpoints.
- `backend/tests/test_timezone_utils.py`: Minimal backend utility tests.
- `backend/*/migrations/__init__.py`: Migration package placeholders.
- `frontend/src/lib/auth-storage.ts`: Client token storage helpers.
- `frontend/src/lib/apiBase.ts`: API base URL resolver for separate-domain deployment.
- `frontend/.env.example`: Frontend env contract for API origin.
- `docs/runbook-static-next-django.md`: End-to-end run and deployment instructions.

## Modified

- `frontend/src/lib/apiClient.ts`: Added API base URL support, bearer auth for admin requests, and 401 handling.
- `frontend/src/lib/api/auth.ts`: Replaced NextAuth client calls with Django JWT auth calls.
- `frontend/src/lib/api/videos.ts`: Upload endpoint now targets Django API base and uses bearer token.
- `frontend/src/lib/api/mappers.ts`: Video URLs now resolve against API base origin.
- `frontend/app/providers.tsx`: Removed `SessionProvider` (NextAuth).
- `frontend/components/admin/admin-layout.tsx`: Replaced `useSession/signOut` with Django auth session checks.
- `frontend/app/admin/login/page.tsx`: Replaced NextAuth session/login flow with Django auth flow.
- `frontend/app/admin/page.tsx`: Changed to client-side redirect for static export compatibility.
- `frontend/app/display/_hooks/useDisplayPolling.ts`: Polls Django API base and uses `since` query param.
- `frontend/app/display/page.tsx`: Video playlist fetch now uses Django API base.
- `frontend/next.config.mjs`: Enabled static export (`output: "export"`).
- `frontend/package.json`: Removed `postinstall` Prisma generate hook.
- `frontend/README.md`: Rewritten for static frontend + Django backend setup.

## Deleted

- `frontend/app/api/**`: Removed all Next.js backend route handlers.
- `frontend/lib/api.ts`: Removed old Next backend helper.
- `frontend/lib/auth.ts`: Removed NextAuth server config.
- `frontend/lib/prisma.ts`: Removed Prisma client singleton.
- `frontend/lib/queue.ts`: Removed old backend queue utility.
- `frontend/lib/rate-limit.ts`: Removed old backend rate limiter.
- `frontend/lib/schedule.ts`: Removed old backend schedule helper.
- `frontend/lib/timezone.ts`: Removed old backend timezone helper.
- `frontend/lib/validators.ts`: Removed old backend validators.
- `frontend/lib/videos.ts`: Removed old backend video helper.
- `frontend/prisma/**`: Removed Prisma schema/migrations from frontend project.
- `frontend/prisma.config.ts`: Removed Prisma config from frontend.
- `frontend/types/next-auth.d.ts`: Removed NextAuth type augmentation.

## Moved

- Video files from `frontend/uploads/videos/*` to `backend/media/videos/*` for backend-owned storage.
