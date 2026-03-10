from __future__ import annotations

from typing import Any

from clinic.models import Doctor, Service


def service_to_dict(service: Service) -> dict[str, Any]:
    return {
        "id": service.id,
        "nameFr": service.name_fr,
        "nameAr": service.name_ar,
        "descriptionFr": service.description_fr,
        "descriptionAr": service.description_ar,
        "active": service.active,
        "createdAt": service.created_at.isoformat(),
        "updatedAt": service.updated_at.isoformat(),
    }


def doctor_to_dict(doctor: Doctor, include_service: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": doctor.id,
        "serviceId": doctor.service_id,
        "nameFr": doctor.name_fr,
        "nameAr": doctor.name_ar,
        "titleFr": doctor.title_fr,
        "titleAr": doctor.title_ar,
        "photoUrl": doctor.photo_url,
        "active": doctor.active,
        "scheduleJson": doctor.schedule_json,
        "morningCapacity": doctor.morning_capacity,
        "eveningCapacity": doctor.evening_capacity,
        "createdAt": doctor.created_at.isoformat(),
        "updatedAt": doctor.updated_at.isoformat(),
    }
    if include_service:
        payload["service"] = service_to_dict(doctor.service)
    return payload
