import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ services });
}
