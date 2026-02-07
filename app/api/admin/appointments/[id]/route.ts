import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextDailyQueueNumber } from "@/lib/queue";
import { getSlotCapacity, isDoctorScheduled } from "@/lib/schedule";
import {
  getClinicWeekday,
  getClinicDateString,
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

const patchSchema = z
  .object({
    appointmentDate: dateStringSchema.optional(),
    slot: slotSchema.optional(),
    serviceId: z.string().min(1).optional(),
    doctorId: z.string().min(1).optional(),
    patientName: z.string().min(1).optional(),
    patientAge: z.number().int().min(0).optional(),
    patientPhone: z.string().min(1).optional(),
    status: appointmentStatusSchema.optional(),
    note: z.string().optional(),
  })
  .strip();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const resolvedParams = await params;
  const id =
    resolvedParams?.id ||
    (() => {
      const segments = new URL(request.url).pathname.split("/").filter(Boolean);
      if (segments.length >= 4 && segments[segments.length - 2] === "appointments") {
        return segments[segments.length - 1];
      }
      return undefined;
    })();
  if (!id) return jsonError("Appointment id is required.", 400);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) return jsonError("Invalid appointment data.", 400);

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findUnique({
        where: { id },
      });

      if (!existing) throw new Error("NOT_FOUND");

      const appointmentDate = parsed.data.appointmentDate
        ? normalizeDateToClinicMidnight(parsed.data.appointmentDate)
        : existing.appointmentDate;

      const slot = parsed.data.slot ?? existing.slot;
      const doctorId = parsed.data.doctorId ?? existing.doctorId;
      const serviceId = parsed.data.serviceId ?? existing.serviceId;
      const status = parsed.data.status ?? existing.status;

      const dateChanged = Boolean(parsed.data.appointmentDate);
      const slotChanged = Boolean(parsed.data.slot);
      const doctorChanged = Boolean(parsed.data.doctorId);
      const serviceChanged = Boolean(parsed.data.serviceId);

      const needsScheduleCheck = dateChanged || slotChanged || doctorChanged;

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
      if ((doctorChanged || serviceChanged) && !doctor.active) {
        throw new Error("DOCTOR_INACTIVE");
      }
      if (doctor.serviceId !== serviceId) throw new Error("SERVICE_MISMATCH");

      if (needsScheduleCheck) {
        const weekday = getClinicWeekday(appointmentDate);
        const scheduleParse = scheduleSchema.safeParse(doctor.scheduleJson);
        if (!scheduleParse.success) throw new Error("SCHEDULE_INVALID");

        if (!isDoctorScheduled(scheduleParse.data, weekday, slot)) {
          throw new Error("SCHEDULE_UNAVAILABLE");
        }
      }

      if (status !== "NO_SHOW") {
        const capacity = getSlotCapacity(doctor, slot);
        const dateStr =
          parsed.data.appointmentDate ??
          getClinicDateString(existing.appointmentDate);
        const { start: dayStart, end: dayEnd } = getClinicDayRange(dateStr);
        const bookedCount = await tx.appointment.count({
          where: {
            appointmentDate: { gte: dayStart, lt: dayEnd },
            doctorId,
            slot,
            status: { not: "NO_SHOW" },
            NOT: { id },
          },
        });
        if (bookedCount >= capacity) throw new Error("SLOT_FULL");
      }

      let dailyQueueNumber = existing.dailyQueueNumber ?? null;
      if (dateChanged) {
        dailyQueueNumber = await nextDailyQueueNumber(tx, { appointmentDate });
      }
      const doctorQueueNumber = dailyQueueNumber ?? existing.doctorQueueNumber;

      return tx.appointment.update({
        where: { id },
        data: {
          appointmentDate,
          slot,
          serviceId,
          doctorId,
          patientName: parsed.data.patientName,
          patientAge: parsed.data.patientAge,
          patientPhone: parsed.data.patientPhone,
          status,
          doctorQueueNumber,
          dailyQueueNumber,
        },
      });
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json({ appointment });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return jsonError("Appointment not found.", 404);
      }
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

    return jsonError("Unable to update appointment.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const resolvedParams = await params;
  const id =
    resolvedParams?.id ||
    (() => {
      const segments = new URL(request.url).pathname.split("/").filter(Boolean);
      if (segments.length >= 4 && segments[segments.length - 2] === "appointments") {
        return segments[segments.length - 1];
      }
      return undefined;
    })();
  if (!id) return jsonError("Appointment id is required.", 400);

  try {
    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Appointment not found.", 404);
  }
}
