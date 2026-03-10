from __future__ import annotations

from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET, require_http_methods

from clinic.formatters import doctor_to_dict, service_to_dict
from clinic.models import DisplayMode, DisplayState, Doctor, DoctorQueueCounter, Service, Appointment
from core.auth import admin_required
from core.http import json_error, parse_json_body
from core.ids import cuid
from core.validators import (
    ValidationError,
    optional_string,
    require_int,
    require_string,
    validate_schedule_json,
)


@require_GET
def public_services(_request: HttpRequest) -> JsonResponse:
    services = Service.objects.filter(active=True).order_by("created_at")
    return JsonResponse({"services": [service_to_dict(service) for service in services]})


@require_GET
def public_doctors(request: HttpRequest) -> JsonResponse:
    service_id = (request.GET.get("serviceId") or "").strip()
    queryset = Doctor.objects.filter(active=True)
    if service_id:
        queryset = queryset.filter(service_id=service_id)
    doctors = queryset.order_by("created_at")
    return JsonResponse({"doctors": [doctor_to_dict(doctor) for doctor in doctors]})


@admin_required
@require_http_methods(["GET", "POST"])
def admin_services(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        services = Service.objects.order_by("-created_at")
        return JsonResponse({"services": [service_to_dict(service) for service in services]})

    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        name_fr = require_string(payload.get("nameFr"), "nameFr")
        name_ar = require_string(payload.get("nameAr"), "nameAr")
        description_fr = require_string(payload.get("descriptionFr"), "descriptionFr")
        description_ar = require_string(payload.get("descriptionAr"), "descriptionAr")
        active = bool(payload.get("active", True))
    except ValidationError:
        return json_error("Invalid service data.", 400)

    service = Service.objects.create(
        id=payload.get("id") or cuid(),
        name_fr=name_fr,
        name_ar=name_ar,
        description_fr=description_fr,
        description_ar=description_ar,
        active=active,
    )

    return JsonResponse({"service": service_to_dict(service)})


@admin_required
@require_http_methods(["PATCH", "DELETE"])
def admin_service_detail(_request: HttpRequest, service_id: str) -> JsonResponse:
    try:
        service = Service.objects.get(id=service_id)
    except Service.DoesNotExist:
        return json_error("Service not found.", 404, "NOT_FOUND")

    if _request.method == "PATCH":
        try:
            payload = parse_json_body(_request)
        except Exception:
            return json_error("Invalid JSON body.", 400)

        updates = {}
        try:
            if "nameFr" in payload:
                updates["name_fr"] = require_string(payload.get("nameFr"), "nameFr")
            if "nameAr" in payload:
                updates["name_ar"] = require_string(payload.get("nameAr"), "nameAr")
            if "descriptionFr" in payload:
                updates["description_fr"] = require_string(payload.get("descriptionFr"), "descriptionFr")
            if "descriptionAr" in payload:
                updates["description_ar"] = require_string(payload.get("descriptionAr"), "descriptionAr")
            if "active" in payload:
                updates["active"] = bool(payload.get("active"))
        except ValidationError:
            return json_error("Invalid service data.", 400)

        for key, value in updates.items():
            setattr(service, key, value)
        service.save(update_fields=list(updates.keys()) or None)
        return JsonResponse({"service": service_to_dict(service)})

    try:
        with transaction.atomic():
            doctors = list(Doctor.objects.filter(service_id=service_id).values_list("id", flat=True))
            Appointment.objects.filter(service_id=service_id).delete()

            if doctors:
                DoctorQueueCounter.objects.filter(doctor_id__in=doctors).delete()
                Doctor.objects.filter(id__in=doctors).delete()

            display = DisplayState.objects.filter(id="singleton").first()
            if display and display.service_id == service_id:
                display.mode = DisplayMode.IDLE
                display.service_id = None
                display.doctor_id = None
                display.appointment_id = None
                display.shown_queue_number = None
                display.save(update_fields=["mode", "service_id", "doctor_id", "appointment_id", "shown_queue_number", "updated_at"])

            service.delete()
    except Exception:
        return json_error("Unable to delete service.", 500, "DELETE_FAILED")

    return JsonResponse({"ok": True})


@admin_required
@require_http_methods(["GET", "POST"])
def admin_doctors(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        doctors = Doctor.objects.select_related("service").order_by("-created_at")
        return JsonResponse({"doctors": [doctor_to_dict(doctor, include_service=True) for doctor in doctors]})

    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        service_id = require_string(payload.get("serviceId"), "serviceId")
        name_fr = require_string(payload.get("nameFr"), "nameFr")
        name_ar = require_string(payload.get("nameAr"), "nameAr")
        title_fr = require_string(payload.get("titleFr"), "titleFr")
        title_ar = require_string(payload.get("titleAr"), "titleAr")
        schedule_json = validate_schedule_json(payload.get("scheduleJson"))
        morning_capacity = require_int(payload.get("morningCapacity", 0), "morningCapacity", 0)
        evening_capacity = require_int(payload.get("eveningCapacity", 0), "eveningCapacity", 0)
    except ValidationError:
        return json_error("Invalid doctor data.", 400)

    if not Service.objects.filter(id=service_id).exists():
        return json_error("Service not found.", 404)

    photo_url = optional_string(payload.get("photoUrl"), "photoUrl")
    doctor = Doctor.objects.create(
        id=payload.get("id") or cuid(),
        service_id=service_id,
        name_fr=name_fr,
        name_ar=name_ar,
        title_fr=title_fr,
        title_ar=title_ar,
        photo_url=photo_url or None,
        active=bool(payload.get("active", True)),
        schedule_json=schedule_json,
        morning_capacity=morning_capacity,
        evening_capacity=evening_capacity,
    )
    return JsonResponse({"doctor": doctor_to_dict(doctor)})


@admin_required
@require_http_methods(["PATCH", "DELETE"])
def admin_doctor_detail(request: HttpRequest, doctor_id: str) -> JsonResponse:
    try:
        doctor = Doctor.objects.get(id=doctor_id)
    except Doctor.DoesNotExist:
        return json_error("Doctor not found.", 404, "NOT_FOUND")

    if request.method == "PATCH":
        try:
            payload = parse_json_body(request)
        except Exception:
            return json_error("Invalid JSON body.", 400)

        updates = {}
        try:
            if "serviceId" in payload:
                service_id = require_string(payload.get("serviceId"), "serviceId")
                if not Service.objects.filter(id=service_id).exists():
                    return json_error("Service not found.", 404)
                updates["service_id"] = service_id
            if "nameFr" in payload:
                updates["name_fr"] = require_string(payload.get("nameFr"), "nameFr")
            if "nameAr" in payload:
                updates["name_ar"] = require_string(payload.get("nameAr"), "nameAr")
            if "titleFr" in payload:
                updates["title_fr"] = require_string(payload.get("titleFr"), "titleFr")
            if "titleAr" in payload:
                updates["title_ar"] = require_string(payload.get("titleAr"), "titleAr")
            if "photoUrl" in payload:
                updates["photo_url"] = optional_string(payload.get("photoUrl"), "photoUrl") or None
            if "scheduleJson" in payload:
                updates["schedule_json"] = validate_schedule_json(payload.get("scheduleJson"))
            if "morningCapacity" in payload:
                updates["morning_capacity"] = require_int(payload.get("morningCapacity"), "morningCapacity", 0)
            if "eveningCapacity" in payload:
                updates["evening_capacity"] = require_int(payload.get("eveningCapacity"), "eveningCapacity", 0)
            if "active" in payload:
                updates["active"] = bool(payload.get("active"))
        except ValidationError:
            return json_error("Invalid doctor data.", 400)

        for key, value in updates.items():
            setattr(doctor, key, value)
        doctor.save(update_fields=list(updates.keys()) or None)
        return JsonResponse({"doctor": doctor_to_dict(doctor)})

    try:
        with transaction.atomic():
            Appointment.objects.filter(doctor_id=doctor_id).delete()
            DoctorQueueCounter.objects.filter(doctor_id=doctor_id).delete()

            display = DisplayState.objects.filter(id="singleton").first()
            if display and display.doctor_id == doctor_id:
                display.mode = DisplayMode.IDLE
                display.service_id = None
                display.doctor_id = None
                display.appointment_id = None
                display.shown_queue_number = None
                display.save(update_fields=["mode", "service_id", "doctor_id", "appointment_id", "shown_queue_number", "updated_at"])

            doctor.delete()
    except Exception:
        return json_error("Unable to delete doctor.", 500, "DELETE_FAILED")

    return JsonResponse({"ok": True})
