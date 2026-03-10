# Django Backend

This backend replaces the old `frontend/app/api/**` Next.js route handlers.

## Setup

1. Create Python env and install deps:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Create `.env` values (see `backend/.env.example`).
3. Run the API:
   ```bash
   python manage.py seed_admin
   python manage.py runserver 0.0.0.0:8000
   ```

## Notes

- Uses existing MariaDB tables (`managed=False` models).
- Timezone logic is enforced for `Africa/Algiers` date/slot behavior.
- Admin auth is JWT bearer (`/api/auth/login`, `/api/auth/session`, `/api/auth/logout`).
- Video files are served from `VIDEOS_DIR` and support HTTP byte ranges for playback.
