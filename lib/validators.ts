import { z } from "zod";

import { isValidDateString } from "@/lib/timezone";

export const slotSchema = z.enum(["MORNING", "EVENING"]);
export const appointmentStatusSchema = z.enum([
  "WAITING",
  "CALLED",
  "DONE",
  "NO_SHOW",
]);
export const displayModeSchema = z.enum(["IDLE", "CALLING", "OFF"]);

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD format")
  .refine(isValidDateString, "Invalid date value");

const dayScheduleSchema = z.object({
  morning: z.boolean(),
  evening: z.boolean(),
});

export const scheduleSchema = z
  .object({
    mon: dayScheduleSchema,
    tue: dayScheduleSchema,
    wed: dayScheduleSchema,
    thu: dayScheduleSchema,
    fri: dayScheduleSchema,
    sat: dayScheduleSchema,
    sun: dayScheduleSchema,
  })
  .strict();

export type ScheduleJson = z.infer<typeof scheduleSchema>;
