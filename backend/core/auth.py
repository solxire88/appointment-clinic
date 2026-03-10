from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable, TypeVar

import jwt
from django.conf import settings
from django.http import HttpRequest, JsonResponse

from clinic.models import AdminUser
from core.http import json_error


class AuthError(Exception):
    pass


def issue_token(user: AdminUser) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.JWT_EXPIRES_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def parse_bearer_token(request: HttpRequest) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer ") :].strip()
    return token or None


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid token") from exc


def get_admin_from_request(request: HttpRequest) -> AdminUser:
    token = parse_bearer_token(request)
    if not token:
        raise AuthError("Missing bearer token")
    payload = decode_token(token)
    role = payload.get("role")
    user_id = payload.get("sub")
    if role != "ADMIN" or not user_id:
        raise AuthError("Unauthorized")

    try:
        user = AdminUser.objects.get(id=user_id)
    except AdminUser.DoesNotExist as exc:
        raise AuthError("Unauthorized") from exc

    if user.role != "ADMIN":
        raise AuthError("Unauthorized")

    request.admin_user = user
    request.auth_payload = payload
    return user


F = TypeVar("F", bound=Callable[..., JsonResponse])


def admin_required(view: F) -> F:
    def wrapped(request, *args, **kwargs):
        try:
            get_admin_from_request(request)
        except AuthError:
            return json_error("Unauthorized", 401)
        return view(request, *args, **kwargs)

    return wrapped  # type: ignore[return-value]
