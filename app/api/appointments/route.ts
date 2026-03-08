import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
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
    middleName: z.string().optional(),
    startedAtMs: z.number().int().optional(),
  })
  .strip();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [ip] = forwardedFor.split(",");
    if (ip?.trim()) return ip.trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`appointment:${clientIp}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly.", code: "TOO_MANY_REQUESTS" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

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
    middleName,
    startedAtMs,
  } = parsed.data;

  if (middleName && middleName.trim().length > 0) {
    return jsonError("Unable to create appointment.", 400, "BOT_SUSPECTED");
  }

  if (typeof startedAtMs === "number") {
    const elapsedMs = Date.now() - startedAtMs;
    if (!Number.isFinite(elapsedMs) || elapsedMs < 2000) {
      return jsonError("Please take a moment to complete the form.", 400, "BOT_SUSPECTED");
    }
  }

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

      const capacity = getSlotCapacity(
        doctor,
        slot,
        scheduleParse.data[weekday]
      );
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

      const appointment = await tx.appointment.create({
        data: {
          appointmentDate,
          slot,
          serviceId,
          doctorId,
          patientName,
          patientAge,
          patientPhone,
          arrivedAt: null,
          doctorQueueNumber: null,
          dailyQueueNumber: null,
          status: "BOOKED",
        },
      });

      return { appointment };
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return NextResponse.json({
      appointment: result.appointment,
      ticket: {
        doctorQueueNumber: null,
        dailyQueueNumber: null,
      },
    });
  } catch (error) {
    console.error("[appointments/create] failed", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2011") {
        return jsonError(
          "Database schema is outdated. Run prisma migrate deploy and prisma generate.",
          500,
          "SCHEMA_OUTDATED"
        );
      }
    }

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
