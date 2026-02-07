import { NextRequest, NextResponse } from "next/server";
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
    morningCapacity: z.number().int().min(0),
    eveningCapacity: z.number().int().min(0),
    active: z.boolean().optional(),
  })
  .strip();

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const doctors = await prisma.doctor.findMany({
    orderBy: { createdAt: "desc" },
    include: { service: true },
  });

  return NextResponse.json({ doctors });
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

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
  });
  if (!service) return jsonError("Service not found.", 404);

  const doctor = await prisma.doctor.create({
    data: {
      ...parsed.data,
      photoUrl: parsed.data.photoUrl || null,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json({ doctor });
}
