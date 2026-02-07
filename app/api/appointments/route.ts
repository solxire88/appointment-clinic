import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { nextDailyQueueNumber } from "@/lib/queue";
import { getSlotCapacity, isDoctorScheduled } from "@/lib/schedule";
import {
  getClinicWeekday,
  getClinicDayRange,
  isDateInPast,
  normalizeDateToClinicMidnight,
} from "@/lib/timezone";
import { dateStringSchema, scheduleSchema, slotSchema } from "@/lib/validators";

export const runtime = "nodejs";

const appointmentSchema = z
  .object({
    appointmentDate: dateStringSchema,
    slot: slotSchema,
    serviceId: z.string().min(1),
    doctorId: z.string().min(1),
    patientName: z.string().min(1),
    patientAge: z.number().int().min(0),
    patientPhone: z.string().min(1),
    note: z.string().optional(),
  })
  .strip();

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = appointmentSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid appointment data.", 400);
  }

  const {
    appointmentDate: appointmentDateStr,
    slot,
    serviceId,
    doctorId,
    patientName,
    patientAge,
    patientPhone,
  } = parsed.data;

  if (isDateInPast(appointmentDateStr)) {
    return jsonError("Appointment date cannot be in the past.", 400);
  }

  const appointmentDate = normalizeDateToClinicMidnight(appointmentDateStr);
  const weekday = getClinicWeekday(appointmentDate);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
      const doctor = await tx.doctor.findFirst({
        where: {
          id: doctorId,
          serviceId,
          active: true,
        },
        select: {
          id: true,
          serviceId: true,
          scheduleJson: true,
          morningCapacity: true,
          eveningCapacity: true,
        },
      });

      if (!doctor) {
        throw new Error("DOCTOR_NOT_FOUND");
      }

      const scheduleParse = scheduleSchema.safeParse(doctor.scheduleJson);
      if (!scheduleParse.success) {
        throw new Error("SCHEDULE_INVALID");
      }

      if (!isDoctorScheduled(scheduleParse.data, weekday, slot)) {
        throw new Error("SCHEDULE_UNAVAILABLE");
      }

      const capacity = getSlotCapacity(doctor, slot);
      const { start: dayStart, end: dayEnd } = getClinicDayRange(appointmentDateStr);
      const bookedCount = await tx.appointment.count({
        where: {
          appointmentDate: { gte: dayStart, lt: dayEnd },
          doctorId,
          slot,
          status: { not: "NO_SHOW" },
        },
      });

      if (bookedCount >= capacity) {
        throw new Error("SLOT_FULL");
      }

      const dailyQueueNumber = await nextDailyQueueNumber(tx, {
        appointmentDate,
      });

      const doctorQueueNumber = dailyQueueNumber;

      const appointment = await tx.appointment.create({
        data: {
          appointmentDate,
          slot,
          serviceId,
          doctorId,
          patientName,
          patientAge,
          patientPhone,
          doctorQueueNumber,
          dailyQueueNumber,
          status: "WAITING",
        },
      });

      return { appointment, doctorQueueNumber, dailyQueueNumber };
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return NextResponse.json({
      appointment: result.appointment,
      ticket: {
        doctorQueueNumber: result.doctorQueueNumber,
        dailyQueueNumber: result.dailyQueueNumber,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DOCTOR_NOT_FOUND") {
        return jsonError("Doctor not found.", 404);
      }
      if (error.message === "SCHEDULE_UNAVAILABLE") {
        return jsonError("Doctor not scheduled for this slot.", 400);
      }
      if (error.message === "SLOT_FULL") {
        return jsonError("Slot is full.", 409, "SLOT_FULL");
      }
      if (error.message === "SCHEDULE_INVALID") {
        return jsonError("Doctor schedule is invalid.", 500);
      }
    }

    return jsonError("Unable to create appointment.", 500);
  }
}
