import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getClinicDateString,
  getClinicDayRange,
  normalizeDateToClinicMidnight,
} from "@/lib/timezone";
import { dateStringSchema } from "@/lib/validators";

export const runtime = "nodejs";

const querySchema = z.object({
  date: dateStringSchema.optional(),
});

export async function GET(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: searchParams.get("date")?.trim() ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("Invalid query parameters.", 400);
  }

  const dateStr = parsed.data.date ?? getClinicDateString();
  const appointmentDate = normalizeDateToClinicMidnight(dateStr);
  const { start: dayStart, end: dayEnd } = getClinicDayRange(dateStr);

  const [statusGroups, slotStatusGroups, serviceGroups, doctorStatusGroups, nextWaiting] =
    await Promise.all([
      prisma.appointment.groupBy({
        by: ["status"],
        where: { appointmentDate: { gte: dayStart, lt: dayEnd } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ["slot", "status"],
        where: { appointmentDate: { gte: dayStart, lt: dayEnd } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ["serviceId"],
        where: { appointmentDate: { gte: dayStart, lt: dayEnd } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ["doctorId", "status"],
        where: { appointmentDate: { gte: dayStart, lt: dayEnd } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ["doctorId"],
        where: { appointmentDate: { gte: dayStart, lt: dayEnd }, status: "WAITING" },
        _min: { doctorQueueNumber: true },
      }),
    ]);

  const byStatus: Record<string, number> = {
    WAITING: 0,
    CALLED: 0,
    DONE: 0,
    NO_SHOW: 0,
  };
  for (const group of statusGroups) {
    byStatus[group.status] = group._count._all;
  }

  const totals = {
    total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
    ...byStatus,
  };

  const bySlot: Record<string, Record<string, number>> = {
    MORNING: { WAITING: 0, CALLED: 0, DONE: 0, NO_SHOW: 0, total: 0 },
    EVENING: { WAITING: 0, CALLED: 0, DONE: 0, NO_SHOW: 0, total: 0 },
  };

  for (const group of slotStatusGroups) {
    bySlot[group.slot][group.status] = group._count._all;
  }

  for (const slot of Object.keys(bySlot)) {
    bySlot[slot].total =
      bySlot[slot].WAITING +
      bySlot[slot].CALLED +
      bySlot[slot].DONE +
      bySlot[slot].NO_SHOW;
  }

  const serviceIds = serviceGroups.map((group) => group.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, nameFr: true, nameAr: true },
  });
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  const byService = serviceGroups
    .map((group) => ({
      serviceId: group.serviceId,
      total: group._count._all,
      ...serviceMap.get(group.serviceId),
    }))
    .sort((a, b) => b.total - a.total);

  const doctorIds = Array.from(
    new Set(doctorStatusGroups.map((group) => group.doctorId))
  );
  const doctors = await prisma.doctor.findMany({
    where: { id: { in: doctorIds } },
    select: { id: true, nameFr: true, nameAr: true },
  });
  const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));

  const waitingMap = new Map(
    nextWaiting.map((group) => [
      group.doctorId,
      group._min.doctorQueueNumber ?? null,
    ])
  );

  const doctorStats: Record<
    string,
    { WAITING: number; CALLED: number; DONE: number }
  > = {};

  for (const group of doctorStatusGroups) {
    if (!doctorStats[group.doctorId]) {
      doctorStats[group.doctorId] = { WAITING: 0, CALLED: 0, DONE: 0 };
    }
    if (group.status !== "NO_SHOW") {
      doctorStats[group.doctorId][group.status] = group._count._all;
    }
  }

  const byDoctor = doctorIds.map((doctorId) => ({
    doctorId,
    ...doctorMap.get(doctorId),
    WAITING: doctorStats[doctorId]?.WAITING ?? 0,
    CALLED: doctorStats[doctorId]?.CALLED ?? 0,
    DONE: doctorStats[doctorId]?.DONE ?? 0,
    nextWaitingNumber: waitingMap.get(doctorId) ?? null,
  }));

  return NextResponse.json({
    date: dateStr,
    totals,
    byStatus,
    bySlot,
    byService,
    byDoctor,
  });
}
