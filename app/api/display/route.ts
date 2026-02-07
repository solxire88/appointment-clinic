import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");

  let sinceDate: Date | null = null;
  if (sinceParam) {
    const parsed = new Date(sinceParam);
    if (Number.isNaN(parsed.getTime())) {
      return jsonError("Invalid since timestamp.", 400);
    }
    sinceDate = parsed;
  }

  const displayState = await prisma.displayState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", mode: "IDLE" },
  });

  if (sinceDate && displayState.updatedAt <= sinceDate) {
    return NextResponse.json({
      changed: false,
      updatedAt: displayState.updatedAt,
    });
  }

  const [doctor, service] = await Promise.all([
    displayState.doctorId
      ? prisma.doctor.findUnique({
          where: { id: displayState.doctorId },
          select: { id: true, nameFr: true, nameAr: true },
        })
      : Promise.resolve(null),
    displayState.serviceId
      ? prisma.service.findUnique({
          where: { id: displayState.serviceId },
          select: { id: true, nameFr: true, nameAr: true },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    changed: true,
    mode: displayState.mode,
    shownQueueNumber: displayState.shownQueueNumber,
    doctor,
    service,
    updatedAt: displayState.updatedAt,
  });
}
