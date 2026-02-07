import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextDailyQueueNumber } from "@/lib/queue";
import { getSlotCapacity, isDoctorScheduled } from "@/lib/schedule";
import {
  getClinicWeekday,
  getClinicDayRange,
  normalizeDateToClinicMidnight,
} from "@/lib/timezone";
import {
  appointmentStatusSchema,
  dateStringSchema,
  scheduleSchema,
  slotSchema,
} from "@/lib/validators";

export const runtime = "nodejs";

const querySchema = z.object({
  date: dateStringSchema,
  slot: slotSchema.optional(),
  serviceId: z.string().min(1).optional(),
  doctorId: z.string().min(1).optional(),
  status: appointmentStatusSchema.optional(),
});

const appointmentSchema = z
  .object({
    appointmentDate: dateStringSchema,
    slot: slotSchema,
    serviceId: z.string().min(1),
    doctorId: z.string().min(1),
    patientName: z.string().min(1),
    patientAge: z.number().int().min(0),
    patientPhone: z.string().min(1),
    status: appointmentStatusSchema.optional(),
    note: z.string().optional(),
  })
  .strip();

export async function GET(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const rawDate = searchParams.get("date");
  const rawSlot = searchParams.get("slot");
  const rawServiceId = searchParams.get("serviceId");
  const rawDoctorId = searchParams.get("doctorId");
  const rawStatus = searchParams.get("status");
  const parsed = querySchema.safeParse({
    date: rawDate?.trim(),
    slot: rawSlot?.trim(),
    serviceId: rawServiceId?.trim(),
    doctorId: rawDoctorId?.trim(),
    status: rawStatus?.trim(),
  });

  if (!parsed.success) {
    return jsonError("Invalid query parameters.", 400);
  }

  const { date, slot, serviceId, doctorId, status } = parsed.data;
  const { start: dayStart, end: dayEnd } = getClinicDayRange(date);

  const where = {
    appointmentDate: { gte: dayStart, lt: dayEnd },
    ...(slot ? { slot } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(doctorId ? { doctorId } : {}),
    ...(status ? { status } : {}),
  };

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: [{ doctorId: "asc" }, { doctorQueueNumber: "asc" }],
    include: {
      doctor: {
        select: {
          id: true,
          nameFr: true,
          nameAr: true,
          titleFr: true,
          titleAr: true,
        },
      },
      service: {
        select: { id: true, nameFr: true, nameAr: true },
      },
    },
  });

  return NextResponse.json({ appointments });
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

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
    status,
  } = parsed.data;

  const appointmentDate = normalizeDateToClinicMidnight(appointmentDateStr);
  const weekday = getClinicWeekday(appointmentDate);
  const effectiveStatus = status ?? "WAITING";

  try {
    const appointment = await prisma.$transaction(
      async (tx) => {
      const doctor = await tx.doctor.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          serviceId: true,
          active: true,
          scheduleJson: true,
          morningCapacity: true,
          eveningCapacity: true,
        },
      });

      if (!doctor) throw new Error("DOCTOR_NOT_FOUND");
      if (!doctor.active) throw new Error("DOCTOR_INACTIVE");
      if (doctor.serviceId !== serviceId) throw new Error("SERVICE_MISMATCH");

      const scheduleParse = scheduleSchema.safeParse(doctor.scheduleJson);
      if (!scheduleParse.success) throw new Error("SCHEDULE_INVALID");
      if (!isDoctorScheduled(scheduleParse.data, weekday, slot)) {
        throw new Error("SCHEDULE_UNAVAILABLE");
      }

      if (effectiveStatus !== "NO_SHOW") {
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
        if (bookedCount >= capacity) throw new Error("SLOT_FULL");
      }

      const dailyQueueNumber = await nextDailyQueueNumber(tx, {
        appointmentDate,
      });
      const doctorQueueNumber = dailyQueueNumber;

      return tx.appointment.create({
        data: {
          appointmentDate,
          slot,
          serviceId,
          doctorId,
          patientName,
          patientAge,
          patientPhone,
          status: effectiveStatus,
          doctorQueueNumber,
          dailyQueueNumber,
        },
      });
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return NextResponse.json({ appointment });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DOCTOR_NOT_FOUND") {
        return jsonError("Doctor not found.", 404);
      }
      if (error.message === "DOCTOR_INACTIVE") {
        return jsonError("Doctor is inactive.", 400);
      }
      if (error.message === "SERVICE_MISMATCH") {
        return jsonError("Doctor does not belong to service.", 400);
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
