import fs from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { NextRequest } from "next/server";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { VIDEOS_DIR } from "@/lib/videos";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id =
    resolvedParams?.id ||
    (() => {
      const segments = new URL(request.url).pathname.split("/").filter(Boolean);
      if (segments.length >= 4 && segments[segments.length - 2] === "file") {
        return segments[segments.length - 1];
      }
      return undefined;
    })();
  if (!id) {
    return jsonError("Video id is required.", 400);
  }

  const video = await prisma.clinicVideo.findUnique({
    where: { id },
  });

  if (!video) {
    return jsonError("Video not found.", 404);
  }

  const filePath = path.join(VIDEOS_DIR, video.filename);
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return jsonError("Video file missing.", 404);
  }

  const fileSize = fileStat.size;
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    const stream = fs.createReadStream(filePath);
    return new Response(Readable.toWeb(stream), {
      status: 200,
      headers: {
        "Content-Type": video.mimeType,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : fileSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  if (start >= fileSize) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  const boundedEnd = Math.min(end, fileSize - 1);
  const stream = fs.createReadStream(filePath, { start, end: boundedEnd });
  const chunkSize = boundedEnd - start + 1;

  return new Response(Readable.toWeb(stream), {
    status: 206,
    headers: {
      "Content-Type": video.mimeType,
      "Content-Length": chunkSize.toString(),
      "Content-Range": `bytes ${start}-${boundedEnd}/${fileSize}`,
      "Accept-Ranges": "bytes",
    },
  });
}
