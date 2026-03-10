from __future__ import annotations

import json
from typing import Any

from django.http import JsonResponse


def json_error(message: str, status: int = 400, code: str | None = None) -> JsonResponse:
    payload: dict[str, Any] = {"error": message}
    if code:
        payload["code"] = code
    return JsonResponse(payload, status=status)


def parse_json_body(request) -> Any:
    if not request.body:
        return {}
    return json.loads(request.body.decode("utf-8"))
