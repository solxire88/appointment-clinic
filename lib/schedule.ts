import type { Slot } from "@prisma/client";

import type { ScheduleJson } from "@/lib/validators";
import type { WeekdayKey } from "@/lib/timezone";

export function isDoctorScheduled(
  schedule: ScheduleJson,
  weekday: WeekdayKey,
  slot: Slot
): boolean {
  const day = schedule[weekday];
  if (!day) return false;
  return slot === "MORNING" ? day.morning : day.evening;
}

export function getSlotCapacity(
  doctor: { morningCapacity: number; eveningCapacity: number },
  slot: Slot
): number {
  return slot === "MORNING" ? doctor.morningCapacity : doctor.eveningCapacity;
}
