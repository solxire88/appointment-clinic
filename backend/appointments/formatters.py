from __future__ import annotations

from typing import Any

from clinic.models import Appointment


def appointment_to_dict(appointment: Appointment, include_relations: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": appointment.id,
        "appointmentDate": appointment.appointment_date.isoformat(),
        "slot": appointment.slot,
        "serviceId": appointment.service_id,
        "doctorId": appointment.doctor_id,
        "patientName": appointment.patient_name,
        "patientAge": appointment.patient_age,
        "patientPhone": appointment.patient_phone,
        "status": appointment.status,
        "arrivedAt": appointment.arrived_at.isoformat() if appointment.arrived_at else None,
        "doctorQueueNumber": appointment.doctor_queue_number,
        "dailyQueueNumber": appointment.daily_queue_number,
        "createdAt": appointment.created_at.isoformat(),
        "updatedAt": appointment.updated_at.isoformat(),
    }

    if include_relations:
        payload["doctor"] = {
            "id": appointment.doctor.id,
            "nameFr": appointment.doctor.name_fr,
            "nameAr": appointment.doctor.name_ar,
            "titleFr": appointment.doctor.title_fr,
            "titleAr": appointment.doctor.title_ar,
            "photoUrl": appointment.doctor.photo_url,
        }
        payload["service"] = {
            "id": appointment.service.id,
            "nameFr": appointment.service.name_fr,
            "nameAr": appointment.service.name_ar,
        }

    return payload
