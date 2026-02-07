import fs from "node:fs/promises";
import path from "node:path";

export const VIDEOS_DIR = path.join(process.cwd(), "uploads", "videos");
export const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

export async function ensureVideosDir() {
  await fs.mkdir(VIDEOS_DIR, { recursive: true });
}

export function getExtensionForMime(mimeType: string): string {
  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "video/webm") return ".webm";
  return "";
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();
}

export function buildVideoFilename(
  id: string,
  originalName: string,
  mimeType: string
): string {
  const extFromName = path.extname(originalName || "").toLowerCase();
  const baseName = path.basename(originalName || "video", extFromName);
  const safeBase = slugify(baseName) || "video";
  const ext = extFromName || getExtensionForMime(mimeType);
  return `${id}-${safeBase}${ext}`;
}
