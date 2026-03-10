from __future__ import annotations

import bcrypt
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET, require_http_methods

from clinic.models import AdminUser
from core.auth import get_admin_from_request, issue_token
from core.http import json_error, parse_json_body
from core.validators import ValidationError, require_string


@require_http_methods(["POST"])
def login_view(request: HttpRequest) -> JsonResponse:
    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        email = require_string(payload.get("email"), "email")
        password = require_string(payload.get("password"), "password")
    except ValidationError:
        return json_error("Invalid credentials.", 401)

    try:
        user = AdminUser.objects.get(email=email)
    except AdminUser.DoesNotExist:
        return json_error("Invalid credentials.", 401)

    if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return json_error("Invalid credentials.", 401)

    token = issue_token(user)
    return JsonResponse(
        {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
            },
        }
    )


@require_GET
def session_view(request: HttpRequest) -> JsonResponse:
    try:
        user = get_admin_from_request(request)
    except Exception:
        return json_error("Unauthorized", 401)

    return JsonResponse(
        {
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
            }
        }
    )


@require_http_methods(["POST"])
def logout_view(_request: HttpRequest) -> JsonResponse:
    return JsonResponse({"ok": True})
