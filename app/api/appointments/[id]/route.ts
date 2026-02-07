import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id =
    resolvedParams?.id ||
    (() => {
      const segments = new URL(_request.url).pathname.split("/").filter(Boolean);
      if (segments.length >= 2 && segments[segments.length - 2] === "appointments") {
        return segments[segments.length - 1];
      }
      return undefined;
    })();
  if (!id) {
    return jsonError("Appointment id is required.", 400);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      doctor: {
        select: {
          id: true,
          nameFr: true,
          nameAr: true,
          titleFr: true,
          titleAr: true,
          photoUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          nameFr: true,
          nameAr: true,
        },
      },
    },
  });

  if (!appointment) {
    return jsonError("Appointment not found.", 404);
  }

  return NextResponse.json({
    id: appointment.id,
    appointmentDate: appointment.appointmentDate,
    slot: appointment.slot,
    doctorQueueNumber: appointment.doctorQueueNumber,
    dailyQueueNumber: appointment.dailyQueueNumber,
    doctor: appointment.doctor,
    service: appointment.service,
    patientName: appointment.patientName,
    patientPhone: appointment.patientPhone,
  });
}
