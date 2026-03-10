from __future__ import annotations

from datetime import datetime
from typing import Any

from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods

from appointments.formatters import appointment_to_dict
from clinic.models import (
    Appointment,
    AppointmentStatus,
    DisplayMode,
    DisplayState,
    Doctor,
    Service,
)
from core.auth import admin_required
from core.http import json_error, parse_json_body
from core.ids import cuid
from core.rate_limit import check_rate_limit
from core.schedule import get_slot_capacity, is_doctor_scheduled
from core.timezone_utils import (
    get_clinic_date_string,
    get_clinic_day_range,
    get_clinic_weekday,
    is_date_in_past,
    normalize_date_to_clinic_midnight,
)
from core.validators import (
    ValidationError,
    parse_date,
    parse_iso_timestamp,
    parse_slot,
    parse_status,
    require_int,
    require_string,
    validate_schedule_json,
)


def _get_arrival_sort_time(appointment: Appointment) -> datetime:
    return appointment.arrived_at or appointment.updated_at or appointment.created_at


def _serialize_display_result(appointment: Appointment | None) -> dict[str, Any]:
    if not appointment:
        return {
            "appointment": None,
            "display": {
                "mode": DisplayMode.IDLE,
                "shownQueueNumber": None,
                "doctorId": None,
                "serviceId": None,
            },
        }

    shown = appointment.daily_queue_number if appointment.daily_queue_number is not None else appointment.doctor_queue_number
    return {
        "appointment": {
            "id": appointment.id,
            "appointmentDate": appointment.appointment_date.isoformat(),
            "slot": appointment.slot,
            "doctorQueueNumber": appointment.doctor_queue_number,
            "dailyQueueNumber": appointment.daily_queue_number,
            "arrivedAt": appointment.arrived_at.isoformat() if appointment.arrived_at else None,
            "status": appointment.status,
            "doctor": {
                "id": appointment.doctor.id,
                "nameFr": appointment.doctor.name_fr,
                "nameAr": appointment.doctor.name_ar,
            },
            "service": {
                "id": appointment.service.id,
                "nameFr": appointment.service.name_fr,
                "nameAr": appointment.service.name_ar,
            },
        },
        "display": {
            "mode": DisplayMode.CALLING,
            "shownQueueNumber": shown,
            "doctorId": appointment.doctor_id,
            "serviceId": appointment.service_id,
        },
    }


@require_GET
def public_availability(request: HttpRequest) -> JsonResponse:
    try:
        date_str = parse_date(request.GET.get("date"), "date")
        slot = parse_slot(request.GET.get("slot"), "slot")
        service_id = require_string(request.GET.get("serviceId"), "serviceId")
    except ValidationError:
        return json_error("Invalid query parameters.", 400)

    appointment_date = normalize_date_to_clinic_midnight(date_str)
    day_start, day_end = get_clinic_day_range(date_str)
    weekday = get_clinic_weekday(appointment_date)

    doctors = list(
        Doctor.objects.filter(service_id=service_id, active=True).only(
            "id",
            "name_fr",
            "name_ar",
            "title_fr",
            "title_ar",
            "photo_url",
            "schedule_json",
            "morning_capacity",
            "evening_capacity",
        )
    )

    if not doctors:
        return JsonResponse({"date": date_str, "slot": slot, "serviceId": service_id, "doctors": []})

    doctor_ids = [doctor.id for doctor in doctors]
    counts = (
        Appointment.objects.filter(
            appointment_date__gte=day_start,
            appointment_date__lt=day_end,
            slot=slot,
            doctor_id__in=doctor_ids,
        )
        .exclude(status=AppointmentStatus.NO_SHOW)
        .values("doctor_id")
        .annotate(total=Count("id"))
    )
    count_map = {row["doctor_id"]: row["total"] for row in counts}

    available_doctors = []
    for doctor in doctors:
        try:
            schedule = validate_schedule_json(doctor.schedule_json)
        except ValidationError:
            continue

        if not is_doctor_scheduled(schedule, weekday, slot):
            continue

        capacity = get_slot_capacity(doctor, slot, schedule.get(weekday))
        booked = count_map.get(doctor.id, 0)
        remaining = capacity - booked
        if remaining <= 0:
            continue

        available_doctors.append(
            {
                "id": doctor.id,
                "nameFr": doctor.name_fr,
                "nameAr": doctor.name_ar,
                "titleFr": doctor.title_fr,
                "titleAr": doctor.title_ar,
                "photoUrl": doctor.photo_url,
                "capacity": capacity,
                "remaining": remaining,
            }
        )

    return JsonResponse({
        "date": date_str,
        "slot": slot,
        "serviceId": service_id,
        "doctors": available_doctors,
    })


@require_http_methods(["POST"])
def public_create_appointment(request: HttpRequest) -> JsonResponse:
    client_ip = request.headers.get("x-forwarded-for", request.META.get("REMOTE_ADDR", "unknown")).split(",")[0].strip()
    allowed, retry_after = check_rate_limit(f"appointment:{client_ip}")
    if not allowed:
        response = JsonResponse(
            {"error": "Too many requests. Please try again shortly.", "code": "TOO_MANY_REQUESTS"},
            status=429,
        )
        response["Retry-After"] = str(retry_after or 1)
        return response

    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        date_str = parse_date(payload.get("appointmentDate"), "appointmentDate")
        slot = parse_slot(payload.get("slot"), "slot")
        service_id = require_string(payload.get("serviceId"), "serviceId")
        doctor_id = require_string(payload.get("doctorId"), "doctorId")
        patient_name = require_string(payload.get("patientName"), "patientName")
        patient_age = require_int(payload.get("patientAge"), "patientAge", 0)
        patient_phone = require_string(payload.get("patientPhone"), "patientPhone")
        middle_name = payload.get("middleName")
        started_at_ms = payload.get("startedAtMs")
    except ValidationError:
        return json_error("Invalid appointment data.", 400)

    if isinstance(middle_name, str) and middle_name.strip():
        return json_error("Unable to create appointment.", 400, "BOT_SUSPECTED")

    if isinstance(started_at_ms, int):
        elapsed_ms = int(datetime.now().timestamp() * 1000) - started_at_ms
        if elapsed_ms < 2000:
            return json_error("Please take a moment to complete the form.", 400, "BOT_SUSPECTED")

    if is_date_in_past(date_str):
        return json_error("Appointment date cannot be in the past.", 400)

    appointment_date = normalize_date_to_clinic_midnight(date_str)
    weekday = get_clinic_weekday(appointment_date)

    try:
        with transaction.atomic():
            doctor = Doctor.objects.filter(id=doctor_id, service_id=service_id, active=True).first()
            if not doctor:
                raise RuntimeError("DOCTOR_NOT_FOUND")

            schedule = validate_schedule_json(doctor.schedule_json)
            if not is_doctor_scheduled(schedule, weekday, slot):
                raise RuntimeError("SCHEDULE_UNAVAILABLE")

            capacity = get_slot_capacity(doctor, slot, schedule.get(weekday))
            day_start, day_end = get_clinic_day_range(date_str)
            booked_count = (
                Appointment.objects.filter(
                    appointment_date__gte=day_start,
                    appointment_date__lt=day_end,
                    doctor_id=doctor_id,
                    slot=slot,
                )
                .exclude(status=AppointmentStatus.NO_SHOW)
                .count()
            )
            if booked_count >= capacity:
                raise RuntimeError("SLOT_FULL")

            appointment = Appointment.objects.create(
                id=cuid(),
                appointment_date=appointment_date,
                slot=slot,
                service_id=service_id,
                doctor_id=doctor_id,
                patient_name=patient_name,
                patient_age=patient_age,
                patient_phone=patient_phone,
                status=AppointmentStatus.BOOKED,
                arrived_at=None,
                doctor_queue_number=None,
                daily_queue_number=None,
            )
    except ValidationError:
        return json_error("Doctor schedule is invalid.", 500)
    except RuntimeError as exc:
        if str(exc) == "DOCTOR_NOT_FOUND":
            return json_error("Doctor not found.", 404)
        if str(exc) == "SCHEDULE_UNAVAILABLE":
            return json_error("Doctor not scheduled for this slot.", 400)
        if str(exc) == "SLOT_FULL":
            return json_error("Slot is full.", 409, "SLOT_FULL")
        return json_error("Unable to create appointment.", 500)
    except Exception:
        return json_error("Unable to create appointment.", 500)

    return JsonResponse(
        {
            "appointment": appointment_to_dict(appointment),
            "ticket": {
                "doctorQueueNumber": None,
                "dailyQueueNumber": None,
            },
        }
    )


@require_GET
def public_get_appointment(_request: HttpRequest, appointment_id: str) -> JsonResponse:
    if not appointment_id:
        return json_error("Appointment id is required.", 400)

    appointment = (
        Appointment.objects.select_related("doctor", "service")
        .filter(id=appointment_id)
        .first()
    )
    if not appointment:
        return json_error("Appointment not found.", 404)

    return JsonResponse(
        {
            "id": appointment.id,
            "appointmentDate": appointment.appointment_date.isoformat(),
            "slot": appointment.slot,
            "doctorQueueNumber": appointment.doctor_queue_number,
            "dailyQueueNumber": appointment.daily_queue_number,
            "doctor": {
                "id": appointment.doctor.id,
                "nameFr": appointment.doctor.name_fr,
                "nameAr": appointment.doctor.name_ar,
                "titleFr": appointment.doctor.title_fr,
                "titleAr": appointment.doctor.title_ar,
                "photoUrl": appointment.doctor.photo_url,
            },
            "service": {
                "id": appointment.service.id,
                "nameFr": appointment.service.name_fr,
                "nameAr": appointment.service.name_ar,
            },
            "patientName": appointment.patient_name,
            "patientPhone": appointment.patient_phone,
        }
    )


@admin_required
@require_http_methods(["GET", "POST"])
def admin_appointments(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        try:
            date_str = parse_date(request.GET.get("date"), "date")
        except ValidationError:
            return json_error("Invalid query parameters.", 400)

        slot = request.GET.get("slot")
        service_id = request.GET.get("serviceId")
        doctor_id = request.GET.get("doctorId")
        status = request.GET.get("status")

        filters = {
            "appointment_date__gte": get_clinic_day_range(date_str)[0],
            "appointment_date__lt": get_clinic_day_range(date_str)[1],
        }
        if slot:
            if slot not in {"MORNING", "EVENING"}:
                return json_error("Invalid query parameters.", 400)
            filters["slot"] = slot
        if service_id:
            filters["service_id"] = service_id.strip()
        if doctor_id:
            filters["doctor_id"] = doctor_id.strip()
        if status:
            if status not in AppointmentStatus.values:
                return json_error("Invalid query parameters.", 400)
            filters["status"] = status.strip()

        appointments = (
            Appointment.objects.select_related("doctor", "service")
            .filter(**filters)
            .order_by("doctor_id", "appointment_date", "created_at")
        )

        return JsonResponse({"appointments": [appointment_to_dict(appt, include_relations=True) for appt in appointments]})

    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        date_str = parse_date(payload.get("appointmentDate"), "appointmentDate")
        slot = parse_slot(payload.get("slot"), "slot")
        service_id = require_string(payload.get("serviceId"), "serviceId")
        doctor_id = require_string(payload.get("doctorId"), "doctorId")
        patient_name = require_string(payload.get("patientName"), "patientName")
        patient_age = require_int(payload.get("patientAge"), "patientAge", 0)
        patient_phone = require_string(payload.get("patientPhone"), "patientPhone")
        queue_number = payload.get("queueNumber")
        if queue_number is not None:
            queue_number = require_int(queue_number, "queueNumber", 1)
        status = payload.get("status")
        effective_status = parse_status(status, "status") if status is not None else AppointmentStatus.BOOKED
    except ValidationError:
        return json_error("Invalid appointment data.", 400)

    appointment_date = normalize_date_to_clinic_midnight(date_str)
    weekday = get_clinic_weekday(appointment_date)

    try:
        with transaction.atomic():
            doctor = Doctor.objects.filter(id=doctor_id).first()
            if not doctor:
                raise RuntimeError("DOCTOR_NOT_FOUND")
            if not doctor.active:
                raise RuntimeError("DOCTOR_INACTIVE")
            if doctor.service_id != service_id:
                raise RuntimeError("SERVICE_MISMATCH")

            schedule = validate_schedule_json(doctor.schedule_json)
            if not is_doctor_scheduled(schedule, weekday, slot):
                raise RuntimeError("SCHEDULE_UNAVAILABLE")

            day_start, day_end = get_clinic_day_range(date_str)
            if effective_status != AppointmentStatus.NO_SHOW:
                capacity = get_slot_capacity(doctor, slot, schedule.get(weekday))
                booked_count = (
                    Appointment.objects.filter(
                        appointment_date__gte=day_start,
                        appointment_date__lt=day_end,
                        doctor_id=doctor_id,
                        slot=slot,
                    )
                    .exclude(status=AppointmentStatus.NO_SHOW)
                    .count()
                )
                if booked_count >= capacity:
                    raise RuntimeError("SLOT_FULL")

            if queue_number is not None:
                conflict = Appointment.objects.filter(
                    appointment_date__gte=day_start,
                    appointment_date__lt=day_end,
                ).filter(Q(daily_queue_number=queue_number) | Q(doctor_queue_number=queue_number)).exists()
                if conflict:
                    raise RuntimeError("QUEUE_NUMBER_TAKEN")

            appointment = Appointment.objects.create(
                id=cuid(),
                appointment_date=appointment_date,
                slot=slot,
                service_id=service_id,
                doctor_id=doctor_id,
                patient_name=patient_name,
                patient_age=patient_age,
                patient_phone=patient_phone,
                status=effective_status,
                arrived_at=timezone.now() if effective_status == AppointmentStatus.WAITING else None,
                doctor_queue_number=queue_number,
                daily_queue_number=queue_number,
            )
    except ValidationError:
        return json_error("Doctor schedule is invalid.", 500)
    except RuntimeError as exc:
        code = str(exc)
        if code == "DOCTOR_NOT_FOUND":
            return json_error("Doctor not found.", 404)
        if code == "DOCTOR_INACTIVE":
            return json_error("Doctor is inactive.", 400)
        if code == "SERVICE_MISMATCH":
            return json_error("Doctor does not belong to service.", 400)
        if code == "SCHEDULE_UNAVAILABLE":
            return json_error("Doctor not scheduled for this slot.", 400)
        if code == "SLOT_FULL":
            return json_error("Slot is full.", 409, "SLOT_FULL")
        if code == "QUEUE_NUMBER_TAKEN":
            return json_error("Queue number already assigned for this day.", 409, "QUEUE_NUMBER_TAKEN")
        return json_error("Unable to create appointment.", 500)
    except Exception:
        return json_error("Unable to create appointment.", 500)

    appointment = Appointment.objects.select_related("doctor", "service").get(id=appointment.id)
    return JsonResponse({"appointment": appointment_to_dict(appointment, include_relations=True)})


@admin_required
@require_http_methods(["PATCH", "DELETE"])
def admin_appointment_detail(request: HttpRequest, appointment_id: str) -> JsonResponse:
    if not appointment_id:
        return json_error("Appointment id is required.", 400)

    appointment = Appointment.objects.filter(id=appointment_id).first()
    if not appointment:
        return json_error("Appointment not found.", 404)

    if request.method == "DELETE":
        appointment.delete()
        return JsonResponse({"ok": True})

    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        appointment_date_str = parse_date(payload.get("appointmentDate"), "appointmentDate") if "appointmentDate" in payload else None
        slot = parse_slot(payload.get("slot"), "slot") if "slot" in payload else appointment.slot
        service_id = require_string(payload.get("serviceId"), "serviceId") if "serviceId" in payload else appointment.service_id
        doctor_id = require_string(payload.get("doctorId"), "doctorId") if "doctorId" in payload else appointment.doctor_id
        patient_name = require_string(payload.get("patientName"), "patientName") if "patientName" in payload else appointment.patient_name
        patient_age = require_int(payload.get("patientAge"), "patientAge", 0) if "patientAge" in payload else appointment.patient_age
        patient_phone = require_string(payload.get("patientPhone"), "patientPhone") if "patientPhone" in payload else appointment.patient_phone
        status = parse_status(payload.get("status"), "status") if "status" in payload else appointment.status
        has_queue = "queueNumber" in payload
        queue_number = payload.get("queueNumber") if has_queue else appointment.doctor_queue_number
        if has_queue and queue_number is not None:
            queue_number = require_int(queue_number, "queueNumber", 1)
    except ValidationError:
        return json_error("Invalid appointment data.", 400)

    new_appointment_date = normalize_date_to_clinic_midnight(appointment_date_str) if appointment_date_str else appointment.appointment_date
    weekday = get_clinic_weekday(new_appointment_date)
    day_date_str = appointment_date_str or get_clinic_date_string(appointment.appointment_date)

    try:
        with transaction.atomic():
            doctor = Doctor.objects.filter(id=doctor_id).first()
            if not doctor:
                raise RuntimeError("DOCTOR_NOT_FOUND")
            if doctor.service_id != service_id:
                raise RuntimeError("SERVICE_MISMATCH")
            if (doctor_id != appointment.doctor_id or service_id != appointment.service_id) and not doctor.active:
                raise RuntimeError("DOCTOR_INACTIVE")

            schedule = validate_schedule_json(doctor.schedule_json)
            needs_schedule = any(k in payload for k in ("appointmentDate", "slot", "doctorId"))
            if needs_schedule and not is_doctor_scheduled(schedule, weekday, slot):
                raise RuntimeError("SCHEDULE_UNAVAILABLE")

            day_start, day_end = get_clinic_day_range(day_date_str)
            if status != AppointmentStatus.NO_SHOW:
                capacity = get_slot_capacity(doctor, slot, schedule.get(weekday))
                booked_count = (
                    Appointment.objects.filter(
                        appointment_date__gte=day_start,
                        appointment_date__lt=day_end,
                        doctor_id=doctor_id,
                        slot=slot,
                    )
                    .exclude(status=AppointmentStatus.NO_SHOW)
                    .exclude(id=appointment_id)
                    .count()
                )
                if booked_count >= capacity:
                    raise RuntimeError("SLOT_FULL")

            if queue_number is not None:
                conflict = Appointment.objects.filter(
                    appointment_date__gte=day_start,
                    appointment_date__lt=day_end,
                ).exclude(id=appointment_id).filter(Q(daily_queue_number=queue_number) | Q(doctor_queue_number=queue_number)).exists()
                if conflict:
                    raise RuntimeError("QUEUE_NUMBER_TAKEN")

            arrived_at = appointment.arrived_at
            if status == AppointmentStatus.WAITING and appointment.status != AppointmentStatus.WAITING:
                arrived_at = timezone.now()
            if status == AppointmentStatus.BOOKED:
                arrived_at = None

            appointment.appointment_date = new_appointment_date
            appointment.slot = slot
            appointment.service_id = service_id
            appointment.doctor_id = doctor_id
            appointment.patient_name = patient_name
            appointment.patient_age = patient_age
            appointment.patient_phone = patient_phone
            appointment.status = status
            appointment.arrived_at = arrived_at
            appointment.doctor_queue_number = queue_number
            appointment.daily_queue_number = queue_number
            appointment.save()
    except ValidationError:
        return json_error("Doctor schedule is invalid.", 500)
    except RuntimeError as exc:
        code = str(exc)
        if code == "DOCTOR_NOT_FOUND":
            return json_error("Doctor not found.", 404)
        if code == "DOCTOR_INACTIVE":
            return json_error("Doctor is inactive.", 400)
        if code == "SERVICE_MISMATCH":
            return json_error("Doctor does not belong to service.", 400)
        if code == "SCHEDULE_UNAVAILABLE":
            return json_error("Doctor not scheduled for this slot.", 400)
        if code == "SLOT_FULL":
            return json_error("Slot is full.", 409, "SLOT_FULL")
        if code == "QUEUE_NUMBER_TAKEN":
            return json_error("Queue number already assigned for this day.", 409, "QUEUE_NUMBER_TAKEN")
        return json_error("Unable to update appointment.", 500)
    except Exception:
        return json_error("Unable to update appointment.", 500)

    appointment = Appointment.objects.select_related("doctor", "service").get(id=appointment.id)
    return JsonResponse({"appointment": appointment_to_dict(appointment, include_relations=True)})


@admin_required
@require_GET
def admin_stats(request: HttpRequest) -> JsonResponse:
    date_param = request.GET.get("date")
    if date_param:
        try:
            date_str = parse_date(date_param, "date")
        except ValidationError:
            return json_error("Invalid query parameters.", 400)
    else:
        date_str = get_clinic_date_string()

    day_start, day_end = get_clinic_day_range(date_str)

    status_groups = (
        Appointment.objects.filter(appointment_date__gte=day_start, appointment_date__lt=day_end)
        .values("status")
        .annotate(total=Count("id"))
    )
    slot_status_groups = (
        Appointment.objects.filter(appointment_date__gte=day_start, appointment_date__lt=day_end)
        .values("slot", "status")
        .annotate(total=Count("id"))
    )
    service_groups = (
        Appointment.objects.filter(appointment_date__gte=day_start, appointment_date__lt=day_end)
        .values("service_id")
        .annotate(total=Count("id"))
    )
    doctor_status_groups = (
        Appointment.objects.filter(appointment_date__gte=day_start, appointment_date__lt=day_end)
        .values("doctor_id", "status")
        .annotate(total=Count("id"))
    )

    waiting_appointments = list(
        Appointment.objects.filter(
            appointment_date__gte=day_start,
            appointment_date__lt=day_end,
            status=AppointmentStatus.WAITING,
        ).only("doctor_id", "patient_name", "arrived_at", "updated_at", "created_at")
    )

    by_status = {"BOOKED": 0, "WAITING": 0, "CALLED": 0, "DONE": 0, "NO_SHOW": 0}
    for row in status_groups:
        by_status[row["status"]] = row["total"]

    totals = {
        "total": sum(by_status.values()),
        **by_status,
    }

    by_slot = {
        "MORNING": {"BOOKED": 0, "WAITING": 0, "CALLED": 0, "DONE": 0, "NO_SHOW": 0, "total": 0},
        "EVENING": {"BOOKED": 0, "WAITING": 0, "CALLED": 0, "DONE": 0, "NO_SHOW": 0, "total": 0},
    }
    for row in slot_status_groups:
        by_slot[row["slot"]][row["status"]] = row["total"]
    for slot in ("MORNING", "EVENING"):
        by_slot[slot]["total"] = sum(by_slot[slot][k] for k in ("BOOKED", "WAITING", "CALLED", "DONE", "NO_SHOW"))

    service_map = {
        service.id: service
        for service in Service.objects.filter(id__in=[row["service_id"] for row in service_groups])
    }
    by_service = []
    for row in service_groups:
        service = service_map.get(row["service_id"])
        by_service.append(
            {
                "serviceId": row["service_id"],
                "total": row["total"],
                "id": service.id if service else None,
                "nameFr": service.name_fr if service else None,
                "nameAr": service.name_ar if service else None,
            }
        )
    by_service.sort(key=lambda item: item["total"], reverse=True)

    doctor_ids = sorted({row["doctor_id"] for row in doctor_status_groups})
    doctors = {doctor.id: doctor for doctor in Doctor.objects.filter(id__in=doctor_ids)}
    doctor_stats: dict[str, dict[str, int]] = {}
    for row in doctor_status_groups:
        doc_stats = doctor_stats.setdefault(row["doctor_id"], {"WAITING": 0, "CALLED": 0, "DONE": 0})
        if row["status"] in {"WAITING", "CALLED", "DONE"}:
            doc_stats[row["status"]] = row["total"]

    waiting_map: dict[str, str] = {}
    waiting_appointments.sort(key=_get_arrival_sort_time)
    for appt in waiting_appointments:
        waiting_map.setdefault(appt.doctor_id, appt.patient_name)

    by_doctor = []
    for doctor_id in doctor_ids:
        doctor = doctors.get(doctor_id)
        stats = doctor_stats.get(doctor_id, {"WAITING": 0, "CALLED": 0, "DONE": 0})
        by_doctor.append(
            {
                "doctorId": doctor_id,
                "id": doctor.id if doctor else None,
                "nameFr": doctor.name_fr if doctor else None,
                "nameAr": doctor.name_ar if doctor else None,
                "WAITING": stats["WAITING"],
                "CALLED": stats["CALLED"],
                "DONE": stats["DONE"],
                "nextWaitingNumber": None,
                "nextWaitingPatientName": waiting_map.get(doctor_id),
            }
        )

    return JsonResponse(
        {
            "date": date_str,
            "totals": totals,
            "byStatus": by_status,
            "bySlot": by_slot,
            "byService": by_service,
            "byDoctor": by_doctor,
        }
    )


@admin_required
@require_http_methods(["POST"])
def admin_call_next(request: HttpRequest) -> JsonResponse:
    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        date_str = parse_date(payload.get("appointmentDate"), "appointmentDate")
        slot = parse_slot(payload.get("slot"), "slot")
        doctor_id = require_string(payload.get("doctorId"), "doctorId")
    except ValidationError:
        return json_error("Invalid request data.", 400)

    day_start, day_end = get_clinic_day_range(date_str)

    try:
        with transaction.atomic():
            current_called = (
                Appointment.objects.select_for_update()
                .filter(
                    appointment_date__gte=day_start,
                    appointment_date__lt=day_end,
                    slot=slot,
                    doctor_id=doctor_id,
                    status=AppointmentStatus.CALLED,
                )
                .order_by("-updated_at")
                .first()
            )
            if current_called:
                current_called.status = AppointmentStatus.DONE
                current_called.save(update_fields=["status", "updated_at"])

            waiting_candidates = list(
                Appointment.objects.select_for_update()
                .filter(
                    appointment_date__gte=day_start,
                    appointment_date__lt=day_end,
                    slot=slot,
                    doctor_id=doctor_id,
                    status=AppointmentStatus.WAITING,
                )
                .order_by("arrived_at", "updated_at", "created_at")
                .select_related("doctor", "service")
            )
            waiting_candidates.sort(key=_get_arrival_sort_time)
            next_waiting = waiting_candidates[0] if waiting_candidates else None

            display, _ = DisplayState.objects.select_for_update().get_or_create(id="singleton", defaults={"mode": DisplayMode.IDLE})

            if not next_waiting:
                display.mode = DisplayMode.IDLE
                display.appointment_id = None
                display.doctor_id = None
                display.service_id = None
                display.shown_queue_number = None
                display.save(update_fields=["mode", "appointment_id", "doctor_id", "service_id", "shown_queue_number", "updated_at"])
                return JsonResponse(_serialize_display_result(None))

            next_waiting.status = AppointmentStatus.CALLED
            next_waiting.save(update_fields=["status", "updated_at"])

            shown = next_waiting.daily_queue_number if next_waiting.daily_queue_number is not None else next_waiting.doctor_queue_number
            display.mode = DisplayMode.CALLING
            display.appointment_id = next_waiting.id
            display.doctor_id = next_waiting.doctor_id
            display.service_id = next_waiting.service_id
            display.shown_queue_number = shown
            display.save(update_fields=["mode", "appointment_id", "doctor_id", "service_id", "shown_queue_number", "updated_at"])

            return JsonResponse(_serialize_display_result(next_waiting))
    except Exception as exc:
        message = f"Unable to call next appointment: {exc}" if True else "Unable to call next appointment."
        return json_error(message, 500)


@admin_required
@require_http_methods(["POST"])
def admin_call_specific(request: HttpRequest) -> JsonResponse:
    try:
        payload = parse_json_body(request)
    except Exception:
        return json_error("Invalid JSON body.", 400)

    try:
        appointment_id = require_string(payload.get("appointmentId"), "appointmentId")
    except ValidationError:
        return json_error("Invalid request data.", 400)

    try:
        with transaction.atomic():
            target = (
                Appointment.objects.select_for_update()
                .select_related("doctor", "service")
                .filter(id=appointment_id)
                .first()
            )
            if not target:
                return json_error("Appointment not found.", 404)
            if target.status != AppointmentStatus.WAITING:
                return json_error("Only waiting appointments can be called.", 409, "NOT_WAITING")

            date_str = get_clinic_date_string(target.appointment_date)
            day_start, day_end = get_clinic_day_range(date_str)

            current_called = (
                Appointment.objects.select_for_update()
                .filter(
                    appointment_date__gte=day_start,
                    appointment_date__lt=day_end,
                    slot=target.slot,
                    doctor_id=target.doctor_id,
                    status=AppointmentStatus.CALLED,
                )
                .order_by("-updated_at")
                .first()
            )
            if current_called and current_called.id != target.id:
                current_called.status = AppointmentStatus.DONE
                current_called.save(update_fields=["status", "updated_at"])

            target.status = AppointmentStatus.CALLED
            target.save(update_fields=["status", "updated_at"])

            shown = target.daily_queue_number if target.daily_queue_number is not None else target.doctor_queue_number
            display, _ = DisplayState.objects.select_for_update().get_or_create(id="singleton", defaults={"mode": DisplayMode.IDLE})
            display.mode = DisplayMode.CALLING
            display.appointment_id = target.id
            display.doctor_id = target.doctor_id
            display.service_id = target.service_id
            display.shown_queue_number = shown
            display.save(update_fields=["mode", "appointment_id", "doctor_id", "service_id", "shown_queue_number", "updated_at"])

            return JsonResponse(_serialize_display_result(target))
    except Exception as exc:
        return json_error(f"Unable to call appointment: {exc}", 500)
