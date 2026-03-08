import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scheduleSchema } from "@/lib/validators";

export const runtime = "nodejs";

const doctorSchema = z
  .object({
    serviceId: z.string().min(1),
    nameFr: z.string().min(1),
    nameAr: z.string().min(1),
    titleFr: z.string().min(1),
    titleAr: z.string().min(1),
    photoUrl: z.string().min(1).optional().or(z.literal("")),
    scheduleJson: scheduleSchema,
    morningCapacity: z.number().int().min(0).optional(),
    eveningCapacity: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .strip();

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { createdAt: "desc" },
      include: { service: true },
    });

    return NextResponse.json({ doctors });
  } catch (error) {
    console.error("[admin/doctors][GET] failed", error);
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return jsonError("Database connection failed.", 500, "DB_CONNECTION_FAILED");
    }
    return jsonError("Unable to load doctors.", 500);
  }
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

  const parsed = doctorSchema.safeParse(payload);
  if (!parsed.success) return jsonError("Invalid doctor data.", 400);

  try {
    const service = await prisma.service.findUnique({
      where: { id: parsed.data.serviceId },
    });
    if (!service) return jsonError("Service not found.", 404);

    const doctor = await prisma.doctor.create({
      data: {
        ...parsed.data,
        photoUrl: parsed.data.photoUrl || null,
        morningCapacity: parsed.data.morningCapacity ?? 0,
        eveningCapacity: parsed.data.eveningCapacity ?? 0,
        active: parsed.data.active ?? true,
      },
    });

    return NextResponse.json({ doctor });
  } catch (error) {
    console.error("[admin/doctors][POST] failed", error);
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return jsonError("Database connection failed.", 500, "DB_CONNECTION_FAILED");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2000") {
        return jsonError("Photo URL is too long.", 400, "PHOTO_URL_TOO_LONG");
      }
      if (error.code === "P2002") {
        return jsonError("Doctor already exists.", 409, "DOCTOR_DUPLICATE");
      }
    }
    return jsonError("Unable to create doctor.", 500);
  }
}
