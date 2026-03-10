from __future__ import annotations

import os

import bcrypt
from django.core.management.base import BaseCommand, CommandError

from clinic.models import AdminUser
from core.ids import cuid


class Command(BaseCommand):
    help = "Create or update the ADMIN user from ADMIN_EMAIL and ADMIN_PASSWORD env vars."

    def handle(self, *args, **options):
        email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
        password = os.getenv("ADMIN_PASSWORD") or ""

        if not email or "@" not in email:
            raise CommandError("ADMIN_EMAIL is required and must be a valid email.")
        if not password:
            raise CommandError("ADMIN_PASSWORD is required.")

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        user = AdminUser.objects.filter(email=email).first()
        if user:
            user.password_hash = password_hash
            user.role = "ADMIN"
            user.save(update_fields=["password_hash", "role", "updated_at"])
            self.stdout.write(self.style.SUCCESS(f"Updated admin user: {email}"))
            return

        AdminUser.objects.create(
            id=cuid(),
            email=email,
            password_hash=password_hash,
            role="ADMIN",
        )
        self.stdout.write(self.style.SUCCESS(f"Created admin user: {email}"))
