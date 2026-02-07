import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClinicDateString, getClinicDayRange } from "@/lib/timezone";

export const runtime = "nodejs";

const bodySchema = z.object({
  appointmentId: z.string().min(1),
});

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

  const { appointmentId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!target) throw new Error("NOT_FOUND");
      const dateStr = getClinicDateString(target.appointmentDate);
      const { start: dayStart, end: dayEnd } = getClinicDayRange(dateStr);

      const currentCalled = await tx.appointment.findFirst({
        where: {
          appointmentDate: { gte: dayStart, lt: dayEnd },
          slot: target.slot,
          doctorId: target.doctorId,
          status: "CALLED",
        },
        orderBy: { doctorQueueNumber: "desc" },
      });

      if (currentCalled && currentCalled.id !== target.id) {
        await tx.appointment.update({
          where: { id: currentCalled.id },
          data: { status: "DONE" },
        });
      }

      const called = await tx.appointment.update({
        where: { id: target.id },
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
          shownQueueNumber: called.doctorQueueNumber,
        },
        create: {
          id: "singleton",
          mode: "CALLING",
          appointmentId: called.id,
          doctorId: called.doctorId,
          serviceId: called.serviceId,
          shownQueueNumber: called.doctorQueueNumber,
        },
      });

      return {
        appointment: {
          id: called.id,
          appointmentDate: called.appointmentDate,
          slot: called.slot,
          doctorQueueNumber: called.doctorQueueNumber,
          status: called.status,
          doctor: called.doctor,
          service: called.service,
        },
        display: {
          mode: "CALLING",
          shownQueueNumber: called.doctorQueueNumber,
          doctorId: called.doctorId,
          serviceId: called.serviceId,
        },
      };
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[call-specific] failed", error);
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return jsonError("Appointment not found.", 404);
    }
    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? `Unable to call appointment: ${error.message}`
        : "Unable to call appointment.";
    return jsonError(message, 500);
  }
}
