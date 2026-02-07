import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isDoctorScheduled, getSlotCapacity } from "@/lib/schedule";
import {
  getClinicWeekday,
  getClinicDayRange,
  normalizeDateToClinicMidnight,
} from "@/lib/timezone";
import { dateStringSchema, scheduleSchema, slotSchema } from "@/lib/validators";

export const runtime = "nodejs";

const querySchema = z.object({
  date: dateStringSchema,
  slot: slotSchema,
  serviceId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: searchParams.get("date")?.trim(),
    slot: searchParams.get("slot")?.trim(),
    serviceId: searchParams.get("serviceId")?.trim(),
  });

  if (!parsed.success) {
    return jsonError("Invalid query parameters.", 400);
  }

  const { date, slot, serviceId } = parsed.data;
  const appointmentDate = normalizeDateToClinicMidnight(date);
  const { start: dayStart, end: dayEnd } = getClinicDayRange(date);
  const weekday = getClinicWeekday(appointmentDate);

  const doctors = await prisma.doctor.findMany({
    where: {
      serviceId,
      active: true,
    },
    select: {
      id: true,
      nameFr: true,
      nameAr: true,
      titleFr: true,
      titleAr: true,
      photoUrl: true,
      scheduleJson: true,
      morningCapacity: true,
      eveningCapacity: true,
    },
  });

  if (!doctors.length) {
    return NextResponse.json({
      date,
      slot,
      serviceId,
      doctors: [],
    });
  }

  if (doctors.length === 0) {
    return NextResponse.json({
      date,
      slot,
      serviceId,
      doctors: [],
    });
  }

  const doctorIds = doctors.map((doctor) => doctor.id);
  const appointmentCounts = await prisma.appointment.groupBy({
    by: ["doctorId"],
    where: {
      appointmentDate: { gte: dayStart, lt: dayEnd },
      slot,
      doctorId: { in: doctorIds },
      status: { not: "NO_SHOW" },
    },
    _count: { _all: true },
  });

  const countMap = new Map(
    appointmentCounts.map((item) => [item.doctorId, item._count._all])
  );

  const availableDoctors = doctors
    .map((doctor) => {
      const scheduleParse = scheduleSchema.safeParse(doctor.scheduleJson);
      if (!scheduleParse.success) {
        return null;
      }

      if (!isDoctorScheduled(scheduleParse.data, weekday, slot)) {
        return null;
      }

      const capacity = getSlotCapacity(doctor, slot);
      const booked = countMap.get(doctor.id) ?? 0;
      const remaining = capacity - booked;

      if (remaining <= 0) return null;

      return {
        id: doctor.id,
        nameFr: doctor.nameFr,
        nameAr: doctor.nameAr,
        titleFr: doctor.titleFr,
        titleAr: doctor.titleAr,
        photoUrl: doctor.photoUrl,
        capacity,
        remaining,
      };
    })
    .filter((doctor) => doctor !== null);

  return NextResponse.json({
    date,
    slot,
    serviceId,
    doctors: availableDoctors,
  });
}
