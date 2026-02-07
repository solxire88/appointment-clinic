import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  idsInOrder: z.array(z.string().min(1)).min(1),
});

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonError("Invalid reorder data.", 400);

  const updates = parsed.data.idsInOrder.map((id, index) =>
    prisma.clinicVideo.update({
      where: { id },
      data: { sortOrder: index },
    })
  );

  await prisma.$transaction(updates);

  return NextResponse.json({ ok: true });
}
