from __future__ import annotations

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET, require_http_methods

from clinic.models import Appointment, DisplayMode, DisplayState, Doctor, Service
from core.auth import admin_required
from core.http import json_error, parse_json_body
from core.validators import ValidationError, parse_display_mode, parse_iso_timestamp


@require_GET
def public_display_state(request: HttpRequest) -> JsonResponse:
    since_param = request.GET.get("since")
    since_date = None
    if since_param:
        try:
            since_date = parse_iso_timestamp(since_param)
        except ValidationError:
            return json_error("Invalid since timestamp.", 400)

    display, _ = DisplayState.objects.get_or_create(id="singleton", defaults={"mode": DisplayMode.IDLE})

    if since_date and display.updated_at <= since_date:
        return JsonResponse({"changed": False, "updatedAt": display.updated_at.isoformat()})

    doctor = Doctor.objects.filter(id=display.doctor_id).first() if display.doctor_id else None
    service = Service.objects.filter(id=display.service_id).first() if display.service_id else None
    appointment = Appointment.objects.filter(id=display.appointment_id).first() if display.appointment_id else None

    return JsonResponse(
        {
            "changed": True,
            "mode": display.mode,
            "shownQueueNumber": display.shown_queue_number,
            "appointment": {
                "id": appointment.id,
                "patientName": appointment.patient_name,
            }
            if appointment
            else None,
            "doctor": {
                "id": doctor.id,
                "nameFr": doctor.name_fr,
                "nameAr": doctor.name_ar,
            }
            if doctor
            else None,
            "service": {
                "id": service.id,
                "nameFr": service.name_fr,
                "nameAr": service.name_ar,
            }
            if service
            else None,
            "updatedAt": display.updated_at.isoformat(),
        }
    )


@admin_required
@require_http_methods(["POST"])
def admin_display_state(request: HttpRequest) -> JsonResponse:
    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        mode = parse_display_mode(payload.get("mode"), "mode")
    except ValidationError:
        return json_error("Invalid request data.", 400)

    if mode == DisplayMode.CALLING:
        return json_error("Mode CALLING is managed by waiting-room controls.", 400)

    display, _ = DisplayState.objects.get_or_create(id="singleton", defaults={"mode": DisplayMode.IDLE})
    display.mode = mode
    display.appointment_id = None
    display.doctor_id = None
    display.service_id = None
    display.shown_queue_number = None
    display.save(update_fields=["mode", "appointment_id", "doctor_id", "service_id", "shown_queue_number", "updated_at"])

    return JsonResponse(
        {
            "display": {
                "id": display.id,
                "mode": display.mode,
                "appointmentId": display.appointment_id,
                "doctorId": display.doctor_id,
                "serviceId": display.service_id,
                "shownQueueNumber": display.shown_queue_number,
                "updatedAt": display.updated_at.isoformat(),
            }
        }
    )
