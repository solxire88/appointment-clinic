import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId") || undefined;

  const doctors = await prisma.doctor.findMany({
    where: {
      active: true,
      ...(serviceId ? { serviceId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ doctors });
}
