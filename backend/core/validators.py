from __future__ import annotations

from datetime import datetime
from typing import Any

from core.timezone_utils import is_valid_date_string

VALID_SLOTS = {"MORNING", "EVENING"}
VALID_APPOINTMENT_STATUSES = {"BOOKED", "WAITING", "CALLED", "DONE", "NO_SHOW"}
VALID_DISPLAY_MODES = {"IDLE", "CALLING", "OFF"}
WEEKDAYS = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}


class ValidationError(ValueError):
    pass


def require_string(value: Any, field: str, min_len: int = 1) -> str:
    if not isinstance(value, str):
        raise ValidationError(f"{field} must be a string")
    val = value.strip()
    if len(val) < min_len:
        raise ValidationError(f"{field} is required")
    return val


def optional_string(value: Any, field: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValidationError(f"{field} must be a string")
    return value.strip()


def require_int(value: Any, field: str, min_value: int | None = None) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValidationError(f"{field} must be an integer")
    if min_value is not None and value < min_value:
        raise ValidationError(f"{field} must be >= {min_value}")
    return value


def parse_date(value: Any, field: str = "date") -> str:
    val = require_string(value, field)
    if not is_valid_date_string(val):
        raise ValidationError(f"{field} must be YYYY-MM-DD")
    return val


def parse_slot(value: Any, field: str = "slot") -> str:
    val = require_string(value, field)
    if val not in VALID_SLOTS:
        raise ValidationError("Invalid slot")
    return val


def parse_status(value: Any, field: str = "status") -> str:
    val = require_string(value, field)
    if val not in VALID_APPOINTMENT_STATUSES:
        raise ValidationError("Invalid status")
    return val


def parse_display_mode(value: Any, field: str = "mode") -> str:
    val = require_string(value, field)
    if val not in VALID_DISPLAY_MODES:
        raise ValidationError("Invalid mode")
    return val


def validate_schedule_json(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValidationError("scheduleJson must be an object")

    result: dict[str, Any] = {}
    for day in WEEKDAYS:
        day_value = value.get(day)
        if not isinstance(day_value, dict):
            raise ValidationError("scheduleJson is invalid")
        morning = day_value.get("morning")
        evening = day_value.get("evening")
        if not isinstance(morning, bool) or not isinstance(evening, bool):
            raise ValidationError("scheduleJson is invalid")
        normalized_day: dict[str, Any] = {"morning": morning, "evening": evening}
        morning_capacity = day_value.get("morningCapacity")
        if morning_capacity is not None:
            normalized_day["morningCapacity"] = require_int(morning_capacity, "morningCapacity", 0)
        evening_capacity = day_value.get("eveningCapacity")
        if evening_capacity is not None:
            normalized_day["eveningCapacity"] = require_int(evening_capacity, "eveningCapacity", 0)
        result[day] = normalized_day

    return result


def parse_iso_timestamp(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValidationError("Invalid since timestamp.") from exc
