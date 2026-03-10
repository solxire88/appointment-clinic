from __future__ import annotations

from typing import Any


def is_doctor_scheduled(schedule: dict[str, Any], weekday: str, slot: str) -> bool:
    day = schedule.get(weekday)
    if not isinstance(day, dict):
        return False
    if slot == "MORNING":
        return bool(day.get("morning"))
    return bool(day.get("evening"))


def get_slot_capacity(doctor, slot: str, day_schedule: dict[str, Any] | None = None) -> int:
    day_schedule = day_schedule or {}
    if slot == "MORNING":
        if isinstance(day_schedule.get("morningCapacity"), int):
            return int(day_schedule["morningCapacity"])
        return int(doctor.morning_capacity)
    if isinstance(day_schedule.get("eveningCapacity"), int):
        return int(day_schedule["eveningCapacity"])
    return int(doctor.evening_capacity)
