from __future__ import annotations

import re
from pathlib import Path

from django.conf import settings

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}


def ensure_videos_dir() -> Path:
    videos_dir = Path(settings.VIDEOS_DIR)
    videos_dir.mkdir(parents=True, exist_ok=True)
    return videos_dir


def get_extension_for_mime(mime_type: str) -> str:
    if mime_type == "video/mp4":
        return ".mp4"
    if mime_type == "video/webm":
        return ".webm"
    return ""


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "video"


def build_video_filename(video_id: str, original_name: str, mime_type: str) -> str:
    path = Path(original_name or "video")
    ext = path.suffix.lower() or get_extension_for_mime(mime_type)
    return f"{video_id}-{slugify(path.stem)}{ext}"
