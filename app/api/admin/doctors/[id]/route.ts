import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scheduleSchema } from "@/lib/validators";

export const runtime = "nodejs";

const doctorPatchSchema = z
  .object({
    serviceId: z.string().min(1).optional(),
    nameFr: z.string().min(1).optional(),
    nameAr: z.string().min(1).optional(),
    titleFr: z.string().min(1).optional(),
    titleAr: z.string().min(1).optional(),
    photoUrl: z.string().min(1).optional().or(z.literal("")),
    scheduleJson: scheduleSchema.optional(),
    morningCapacity: z.number().int().min(0).optional(),
    eveningCapacity: z.number().int().min(0).optional(),
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
  if (!id) return jsonError("Doctor id is required.", 400);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = doctorPatchSchema.safeParse(payload);
  if (!parsed.success) return jsonError("Invalid doctor data.", 400);

  try {
    if (parsed.data.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: parsed.data.serviceId },
      });
      if (!service) return jsonError("Service not found.", 404);
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...parsed.data,
        photoUrl:
          parsed.data.photoUrl === "" ? null : parsed.data.photoUrl ?? undefined,
      },
    });

    return NextResponse.json({ doctor });
  } catch (error) {
    console.error("[admin/doctors][PATCH] failed", error);
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return jsonError("Database connection failed.", 500, "DB_CONNECTION_FAILED");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2000") {
        return jsonError("Photo URL is too long.", 400, "PHOTO_URL_TOO_LONG");
      }
      if (error.code === "P2025") {
        return jsonError("Doctor not found.", 404, "NOT_FOUND");
      }
    }
    return jsonError("Unable to update doctor.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  if (!id) return jsonError("Doctor id is required.", 400);

  const existing = await prisma.doctor.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return jsonError("Doctor not found.", 404, "NOT_FOUND");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.deleteMany({ where: { doctorId: id } });
      await tx.doctorQueueCounter.deleteMany({ where: { doctorId: id } });

      const display = await tx.displayState.findUnique({
        where: { id: "singleton" },
        select: { doctorId: true },
      });
      if (display?.doctorId === id) {
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

      await tx.doctor.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Unable to delete doctor.", 500, "DELETE_FAILED");
  }
}
