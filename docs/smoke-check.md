# Smoke Check

1. Seed admin login
- Run `pnpm prisma generate` (or `pnpm prisma migrate dev`) then `pnpm prisma db seed`
- Visit `/admin/login` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

2. Create service + doctor
- In `/admin/services`, create a bilingual service.
- In `/admin/doctors`, create a doctor with schedule + capacity.

3. Public availability
- On home page, choose service/date/slot.
- Verify only available doctors appear (and disabled when full).

4. Book appointment
- Submit appointment form and confirm `doctorQueueNumber` is shown.
- Download ticket and verify service/doctor names.

5. Admin appointments
- `/admin/appointments`: create/edit/delete an appointment.
- Verify `SLOT_FULL` and schedule errors show appropriate messages.

6. Waiting room
- `/admin/waiting-room`: select date + slot, call next.
- Verify previous CALLED becomes DONE and display updates.

7. Display page
- Open `/display` on another screen.
- Ensure IDLE shows playlist, CALLING shows overlay, OFF hides.

8. Videos
- `/admin/media`: upload video, toggle enable, reorder.
- Verify `/display` plays enabled videos and `/api/videos/file/:id` streams.
