import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const serviceSchema = z
  .object({
    nameFr: z.string().min(1),
    nameAr: z.string().min(1),
    descriptionFr: z.string().min(1),
    descriptionAr: z.string().min(1),
    active: z.boolean().optional(),
  })
  .strip();

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ services });
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

  const parsed = serviceSchema.safeParse(payload);
  if (!parsed.success) return jsonError("Invalid service data.", 400);

  const service = await prisma.service.create({
    data: {
      ...parsed.data,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json({ service });
}
