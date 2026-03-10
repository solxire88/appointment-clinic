from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.http import FileResponse, HttpRequest, HttpResponse, JsonResponse, StreamingHttpResponse
from django.views.decorators.http import require_GET, require_http_methods

from clinic.models import ClinicVideo
from core.auth import admin_required
from core.http import json_error
from core.ids import cuid
from core.validators import ValidationError, require_int, require_string
from core.videos import ALLOWED_VIDEO_TYPES, build_video_filename, ensure_videos_dir


VIDEO_CHUNK_SIZE = 8192


def _video_to_dict(video: ClinicVideo) -> dict:
    return {
        "id": video.id,
        "title": video.title,
        "filename": video.filename,
        "mimeType": video.mime_type,
        "sizeBytes": video.size_bytes,
        "enabled": video.enabled,
        "sortOrder": video.sort_order,
        "createdAt": video.created_at.isoformat(),
        "updatedAt": video.updated_at.isoformat(),
    }


@require_GET
def public_videos(_request: HttpRequest) -> JsonResponse:
    videos = ClinicVideo.objects.filter(enabled=True).order_by("sort_order", "created_at")
    return JsonResponse(
        {
            "videos": [
                {
                    "id": video.id,
                    "title": video.title,
                    "sortOrder": video.sort_order,
                    "url": f"/api/videos/file/{video.id}",
                }
                for video in videos
            ]
        }
    )


@require_GET
def public_video_file(request: HttpRequest, video_id: str) -> HttpResponse:
    if not video_id:
        return json_error("Video id is required.", 400)

    video = ClinicVideo.objects.filter(id=video_id).first()
    if not video:
        return json_error("Video not found.", 404)

    file_path = Path(settings.VIDEOS_DIR) / video.filename
    if not file_path.exists():
        return json_error("Video file missing.", 404)

    file_size = file_path.stat().st_size
    range_header = request.headers.get("Range")

    if not range_header:
        response = FileResponse(open(file_path, "rb"), content_type=video.mime_type)
        response["Content-Length"] = str(file_size)
        response["Accept-Ranges"] = "bytes"
        return response

    if not range_header.startswith("bytes="):
        response = HttpResponse(status=416)
        response["Content-Range"] = f"bytes */{file_size}"
        return response

    ranges = range_header.replace("bytes=", "").split("-")
    try:
        start = int(ranges[0]) if ranges[0] else 0
        end = int(ranges[1]) if len(ranges) > 1 and ranges[1] else file_size - 1
    except ValueError:
        response = HttpResponse(status=416)
        response["Content-Range"] = f"bytes */{file_size}"
        return response

    if start >= file_size or start > end:
        response = HttpResponse(status=416)
        response["Content-Range"] = f"bytes */{file_size}"
        return response

    end = min(end, file_size - 1)
    length = end - start + 1

    def _stream_range(path: Path, start_pos: int, end_pos: int):
        with open(path, "rb") as file_handle:
            file_handle.seek(start_pos)
            remaining = end_pos - start_pos + 1
            while remaining > 0:
                chunk = file_handle.read(min(VIDEO_CHUNK_SIZE, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    response = StreamingHttpResponse(
        _stream_range(file_path, start, end),
        status=206,
        content_type=video.mime_type,
    )
    response["Content-Length"] = str(length)
    response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    response["Accept-Ranges"] = "bytes"
    return response


@admin_required
@require_GET
def admin_videos(_request: HttpRequest) -> JsonResponse:
    videos = ClinicVideo.objects.order_by("sort_order", "created_at")
    return JsonResponse({"videos": [_video_to_dict(video) for video in videos]})


@admin_required
@require_http_methods(["POST"])
def admin_upload_video(request: HttpRequest) -> JsonResponse:
    file = request.FILES.get("file")
    title = (request.POST.get("title") or "").strip()

    if not file:
        return json_error("Video file is required.", 400)

    if file.content_type not in ALLOWED_VIDEO_TYPES:
        return json_error("Unsupported video type.", 400)

    max_bytes = int(settings.MAX_VIDEO_MB) * 1024 * 1024
    if file.size > max_bytes:
        return json_error("Video file exceeds max size.", 413)

    ensure_videos_dir()
    last = ClinicVideo.objects.order_by("-sort_order").first()
    next_sort = (last.sort_order if last else 0) + 1
    video = ClinicVideo.objects.create(
        id=cuid(),
        title=title or Path(file.name).stem or "Video",
        filename="pending",
        mime_type=file.content_type,
        size_bytes=file.size,
        enabled=True,
        sort_order=next_sort,
    )

    filename = build_video_filename(video.id, file.name, file.content_type)
    target_path = Path(settings.VIDEOS_DIR) / filename

    try:
        with open(target_path, "wb+") as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        video.filename = filename
        video.title = title or Path(file.name).stem or "Video"
        video.size_bytes = file.size
        video.mime_type = file.content_type
        video.save(update_fields=["filename", "title", "size_bytes", "mime_type", "updated_at"])
        return JsonResponse({"video": _video_to_dict(video)})
    except Exception:
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        video.delete()
        return json_error("Unable to save video.", 500)


@admin_required
@require_http_methods(["PATCH", "DELETE"])
def admin_video_detail(request: HttpRequest, video_id: str) -> JsonResponse:
    if not video_id:
        return json_error("Video id is required.", 400)

    video = ClinicVideo.objects.filter(id=video_id).first()
    if not video:
        return json_error("Video not found.", 404)

    if request.method == "PATCH":
        try:
            import json

            payload = json.loads(request.body.decode("utf-8")) if request.body else {}
        except Exception:
            return json_error("Invalid JSON body.", 400)

        updates = {}
        try:
            if "title" in payload:
                updates["title"] = require_string(payload.get("title"), "title")
            if "enabled" in payload:
                updates["enabled"] = bool(payload.get("enabled"))
            if "sortOrder" in payload:
                updates["sort_order"] = require_int(payload.get("sortOrder"), "sortOrder")
        except ValidationError:
            return json_error("Invalid video data.", 400)

        for key, value in updates.items():
            setattr(video, key, value)
        video.save(update_fields=list(updates.keys()) + ["updated_at"] if updates else None)
        return JsonResponse({"video": _video_to_dict(video)})

    file_path = Path(settings.VIDEOS_DIR) / video.filename
    video.delete()
    if file_path.exists():
        file_path.unlink(missing_ok=True)
    return JsonResponse({"ok": True})


@admin_required
@require_http_methods(["POST"])
def admin_reorder_videos(request: HttpRequest) -> JsonResponse:
    try:
        import json

        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return json_error("Invalid JSON body.", 400)

    ids = payload.get("idsInOrder")
    if not isinstance(ids, list) or not ids:
        return json_error("Invalid reorder data.", 400)

    try:
        with transaction.atomic():
            for index, video_id in enumerate(ids):
                if not isinstance(video_id, str) or not video_id.strip():
                    raise ValidationError("Invalid reorder data.")
                ClinicVideo.objects.filter(id=video_id).update(sort_order=index)
    except ValidationError:
        return json_error("Invalid reorder data.", 400)

    return JsonResponse({"ok": True})
