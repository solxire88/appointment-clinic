import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClinicDayRange } from "@/lib/timezone";
import { dateStringSchema, slotSchema } from "@/lib/validators";

export const runtime = "nodejs";

const bodySchema = z.object({
  appointmentDate: dateStringSchema,
  slot: slotSchema,
  doctorId: z.string().min(1),
});

function getArrivalSortTime(appointment: {
  arrivedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}): number {
  if (appointment.arrivedAt) {
    return appointment.arrivedAt.getTime();
  }

  return appointment.updatedAt.getTime() || appointment.createdAt.getTime();
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

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonError("Invalid request data.", 400);

  const { appointmentDate: dateStr, slot, doctorId } = parsed.data;
  const { start: dayStart, end: dayEnd } = getClinicDayRange(dateStr);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentCalled = await tx.appointment.findFirst({
        where: {
          appointmentDate: { gte: dayStart, lt: dayEnd },
          slot,
          doctorId,
          status: "CALLED",
        },
        orderBy: { updatedAt: "desc" },
      });

      if (currentCalled) {
        await tx.appointment.update({
          where: { id: currentCalled.id },
          data: { status: "DONE" },
        });
      }

      const waitingCandidates = await tx.appointment.findMany({
        where: {
          appointmentDate: { gte: dayStart, lt: dayEnd },
          slot,
          doctorId,
          status: "WAITING",
        },
        orderBy: [{ arrivedAt: "asc" }, { updatedAt: "asc" }, { createdAt: "asc" }],
      });

      const nextWaiting = waitingCandidates.sort(
        (a, b) => getArrivalSortTime(a) - getArrivalSortTime(b)
      )[0];

      if (!nextWaiting) {
        await tx.displayState.upsert({
          where: { id: "singleton" },
          update: {
            mode: "IDLE",
            appointmentId: null,
            doctorId: null,
            serviceId: null,
            shownQueueNumber: null,
          },
          create: { id: "singleton", mode: "IDLE" },
        });
        return {
          appointment: null,
          display: {
            mode: "IDLE",
            shownQueueNumber: null,
            doctorId: null,
            serviceId: null,
          },
        };
      }

      const called = await tx.appointment.update({
        where: { id: nextWaiting.id },
        data: { status: "CALLED" },
        include: {
          doctor: { select: { id: true, nameFr: true, nameAr: true } },
          service: { select: { id: true, nameFr: true, nameAr: true } },
        },
      });

      await tx.displayState.upsert({
        where: { id: "singleton" },
        update: {
          mode: "CALLING",
          appointmentId: called.id,
          doctorId: called.doctorId,
          serviceId: called.serviceId,
          shownQueueNumber: called.dailyQueueNumber ?? called.doctorQueueNumber ?? null,
        },
        create: {
          id: "singleton",
          mode: "CALLING",
          appointmentId: called.id,
          doctorId: called.doctorId,
          serviceId: called.serviceId,
          shownQueueNumber: called.dailyQueueNumber ?? called.doctorQueueNumber ?? null,
        },
      });

      return {
        appointment: {
          id: called.id,
          appointmentDate: called.appointmentDate,
          slot: called.slot,
          doctorQueueNumber: called.doctorQueueNumber,
          dailyQueueNumber: called.dailyQueueNumber,
          arrivedAt: called.arrivedAt,
          status: called.status,
          doctor: called.doctor,
          service: called.service,
        },
        display: {
          mode: "CALLING",
          shownQueueNumber: called.dailyQueueNumber ?? called.doctorQueueNumber ?? null,
          doctorId: called.doctorId,
          serviceId: called.serviceId,
        },
      };
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[call-next] failed", error);
    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? `Unable to call next appointment: ${error.message}`
        : "Unable to call next appointment.";
    return jsonError(message, 500);
  }
}
