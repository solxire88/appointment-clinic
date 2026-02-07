import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayModeSchema } from "@/lib/validators";

export const runtime = "nodejs";

const bodySchema = z.object({
  mode: displayModeSchema,
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
  if (!parsed.success) return jsonError("Invalid request data.", 400);

  const { mode } = parsed.data;
  if (mode === "CALLING") {
    return jsonError("Mode CALLING is managed by waiting-room controls.", 400);
  }

  const display = await prisma.displayState.upsert({
    where: { id: "singleton" },
    update: {
      mode,
      appointmentId: null,
      doctorId: null,
      serviceId: null,
      shownQueueNumber: null,
    },
    create: {
      id: "singleton",
      mode,
    },
  });

  return NextResponse.json({ display });
}
