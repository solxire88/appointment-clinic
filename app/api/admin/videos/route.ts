import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const videos = await prisma.clinicVideo.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ videos });
}
