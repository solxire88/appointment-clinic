from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

CLINIC_TIME_ZONE = ZoneInfo("Africa/Algiers")
DATE_FORMAT = "%Y-%m-%d"


class DateFormatError(ValueError):
    pass


def parse_date_string(date_str: str) -> datetime:
    try:
        dt = datetime.strptime(date_str, DATE_FORMAT)
    except ValueError as exc:
        raise DateFormatError("Expected YYYY-MM-DD") from exc
    return dt


def is_valid_date_string(date_str: str) -> bool:
    try:
        parse_date_string(date_str)
        return True
    except DateFormatError:
        return False


def normalize_date_to_clinic_midnight(date_str: str) -> datetime:
    day = parse_date_string(date_str)
    local_midnight = datetime.combine(day.date(), time.min, tzinfo=CLINIC_TIME_ZONE)
    return local_midnight.astimezone(ZoneInfo("UTC"))


def get_clinic_day_range(date_str: str) -> tuple[datetime, datetime]:
    start = normalize_date_to_clinic_midnight(date_str)
    day = parse_date_string(date_str)
    next_day = day + timedelta(days=1)
    end = normalize_date_to_clinic_midnight(next_day.strftime(DATE_FORMAT))
    return start, end


def get_clinic_weekday(dt: datetime) -> str:
    local = dt.astimezone(CLINIC_TIME_ZONE)
    weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    return weekdays[local.weekday()]


def get_clinic_date_string(dt: datetime | None = None) -> str:
    current = dt or datetime.now(tz=CLINIC_TIME_ZONE)
    return current.astimezone(CLINIC_TIME_ZONE).strftime(DATE_FORMAT)


def is_date_in_past(date_str: str) -> bool:
    target = parse_date_string(date_str).date()
    today = datetime.now(tz=CLINIC_TIME_ZONE).date()
    return target < today
