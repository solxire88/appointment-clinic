import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const servicePatchSchema = z
  .object({
    nameFr: z.string().min(1).optional(),
    nameAr: z.string().min(1).optional(),
    descriptionFr: z.string().min(1).optional(),
    descriptionAr: z.string().min(1).optional(),
    active: z.boolean().optional(),
  })
  .strip();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  if (!id) return jsonError("Service id is required.", 400);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = servicePatchSchema.safeParse(payload);
  if (!parsed.success) return jsonError("Invalid service data.", 400);

  const service = await prisma.service.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ service });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  if (!id) return jsonError("Service id is required.", 400);

  const existing = await prisma.service.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return jsonError("Service not found.", 404, "NOT_FOUND");

  try {
    await prisma.$transaction(async (tx) => {
      const doctors = await tx.doctor.findMany({
        where: { serviceId: id },
        select: { id: true },
      });
      const doctorIds = doctors.map((doctor) => doctor.id);

      await tx.appointment.deleteMany({ where: { serviceId: id } });

      if (doctorIds.length > 0) {
        await tx.doctorQueueCounter.deleteMany({
          where: { doctorId: { in: doctorIds } },
        });
        await tx.doctor.deleteMany({ where: { id: { in: doctorIds } } });
      }

      const display = await tx.displayState.findUnique({
        where: { id: "singleton" },
        select: { serviceId: true },
      });
      if (display?.serviceId === id) {
        await tx.displayState.update({
          where: { id: "singleton" },
          data: {
            mode: "IDLE",
            serviceId: null,
            doctorId: null,
            appointmentId: null,
            shownQueueNumber: null,
          },
        });
      }

      await tx.service.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Unable to delete service.", 500, "DELETE_FAILED");
  }
}
