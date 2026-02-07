import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_VIDEO_TYPES,
  buildVideoFilename,
  ensureVideosDir,
  VIDEOS_DIR,
} from "@/lib/videos";

export const runtime = "nodejs";

const DEFAULT_MAX_MB = 100;

function resolveMaxBytes() {
  const raw = process.env.MAX_VIDEO_MB;
  const parsed = raw ? Number(raw) : DEFAULT_MAX_MB;
  const safe = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_MB;
  return safe * 1024 * 1024;
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const formData = await request.formData();
  const file = formData.get("file");
  const titleField = formData.get("title");

  if (!file || !(file instanceof File)) {
    return jsonError("Video file is required.", 400);
  }

  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return jsonError("Unsupported video type.", 400);
  }

  const maxBytes = resolveMaxBytes();
  if (file.size > maxBytes) {
    return jsonError("Video file exceeds max size.", 413);
  }

  const originalName = file.name || "video";
  const title =
    typeof titleField === "string" && titleField.trim()
      ? titleField.trim()
      : path.basename(originalName, path.extname(originalName));

  await ensureVideosDir();

  const lastVideo = await prisma.clinicVideo.findFirst({
    orderBy: { sortOrder: "desc" },
  });

  const sortOrder = (lastVideo?.sortOrder ?? 0) + 1;

  const created = await prisma.clinicVideo.create({
    data: {
      title: title || "Video",
      filename: "pending",
      mimeType: file.type,
      sizeBytes: file.size,
      enabled: true,
      sortOrder,
    },
  });

  const filename = buildVideoFilename(created.id, originalName, file.type);
  const filePath = path.join(VIDEOS_DIR, filename);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const video = await prisma.clinicVideo.update({
      where: { id: created.id },
      data: {
        filename,
        mimeType: file.type,
        sizeBytes: file.size,
        title: title || "Video",
      },
    });

    return NextResponse.json({ video });
  } catch (error) {
    await prisma.clinicVideo.delete({ where: { id: created.id } });
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore cleanup failures
    }
    return jsonError("Unable to save video.", 500);
  }
}
