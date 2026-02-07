import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const videos = await prisma.clinicVideo.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      sortOrder: true,
    },
  });

  return NextResponse.json({
    videos: videos.map((video) => ({
      ...video,
      url: `/api/videos/file/${video.id}`,
    })),
  });
}
