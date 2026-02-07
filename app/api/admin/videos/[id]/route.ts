import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VIDEOS_DIR } from "@/lib/videos";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    title: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .strip();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const resolvedParams = await params;
  const id =
    resolvedParams?.id ||
    (() => {
      const segments = new URL(request.url).pathname.split("/").filter(Boolean);
      if (segments.length >= 4 && segments[segments.length - 2] === "videos") {
        return segments[segments.length - 1];
      }
      return undefined;
    })();
  if (!id) return jsonError("Video id is required.", 400);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) return jsonError("Invalid video data.", 400);

  const video = await prisma.clinicVideo.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ video });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const resolvedParams = await params;
  const id =
    resolvedParams?.id ||
    (() => {
      const segments = new URL(request.url).pathname.split("/").filter(Boolean);
      if (segments.length >= 4 && segments[segments.length - 2] === "videos") {
        return segments[segments.length - 1];
      }
      return undefined;
    })();
  if (!id) return jsonError("Video id is required.", 400);

  const video = await prisma.clinicVideo.findUnique({
    where: { id },
  });

  if (!video) return jsonError("Video not found.", 404);

  await prisma.clinicVideo.delete({ where: { id } });

  const filePath = path.join(VIDEOS_DIR, video.filename);
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing files
  }

  return NextResponse.json({ ok: true });
}
