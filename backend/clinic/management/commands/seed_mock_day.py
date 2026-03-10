from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from clinic.models import (
    Appointment,
    AppointmentStatus,
    DailyQueueCounter,
    Doctor,
    DoctorQueueCounter,
    Service,
    Slot,
)
from core.ids import cuid
from core.timezone_utils import (
    CLINIC_TIME_ZONE,
    get_clinic_date_string,
    get_clinic_day_range,
    is_valid_date_string,
    normalize_date_to_clinic_midnight,
)


class Command(BaseCommand):
    help = "Seed mock services, doctors, and appointments for one clinic day."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            type=str,
            default=get_clinic_date_string(),
            help="Target date (YYYY-MM-DD). Defaults to today in Africa/Algiers.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete previously seeded mock appointments for that date before inserting.",
        )

    def handle(self, *args, **options):
        date_str = options["date"].strip()
        reset = bool(options["reset"])

        if not is_valid_date_string(date_str):
            raise CommandError("--date must be YYYY-MM-DD")

        day_start, day_end = get_clinic_day_range(date_str)
        appointment_date = normalize_date_to_clinic_midnight(date_str)

        service_specs = [
            {
                "name_fr": "[MOCK] Médecine Générale",
                "name_ar": "[MOCK] طب عام",
                "description_fr": "Service de test pour validations.",
                "description_ar": "خدمة اختبار للتجارب.",
            },
            {
                "name_fr": "[MOCK] Pédiatrie",
                "name_ar": "[MOCK] طب الأطفال",
                "description_fr": "Pédiatrie (données de test).",
                "description_ar": "طب الأطفال (بيانات تجريبية).",
            },
            {
                "name_fr": "[MOCK] Cardiologie",
                "name_ar": "[MOCK] أمراض القلب",
                "description_fr": "Cardiologie (données de test).",
                "description_ar": "أمراض القلب (بيانات تجريبية).",
            },
        ]

        full_schedule = {
            day: {
                "morning": True,
                "evening": True,
                "morningCapacity": 8,
                "eveningCapacity": 6,
            }
            for day in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
        }

        with transaction.atomic():
            services: list[Service] = []
            for spec in service_specs:
                service = Service.objects.filter(
                    name_fr=spec["name_fr"],
                    name_ar=spec["name_ar"],
                ).first()
                if not service:
                    service = Service.objects.create(
                        id=cuid(),
                        name_fr=spec["name_fr"],
                        name_ar=spec["name_ar"],
                        description_fr=spec["description_fr"],
                        description_ar=spec["description_ar"],
                        active=True,
                    )
                services.append(service)

            doctor_specs = [
                (services[0], "[MOCK] Dr Amine Rahal", "[MOCK] د. أمين رحال", "Médecin généraliste", "طبيب عام"),
                (services[0], "[MOCK] Dr Lina Haddad", "[MOCK] د. لينا حداد", "Médecin généraliste", "طبيبة عامة"),
                (services[1], "[MOCK] Dr Sara Benaissa", "[MOCK] د. سارة بن عيسى", "Pédiatre", "طبيبة أطفال"),
                (services[2], "[MOCK] Dr Nabil Kaci", "[MOCK] د. نبيل قاسي", "Cardiologue", "طبيب قلب"),
            ]

            doctors: list[Doctor] = []
            for service, name_fr, name_ar, title_fr, title_ar in doctor_specs:
                doctor = Doctor.objects.filter(
                    service_id=service.id,
                    name_fr=name_fr,
                    name_ar=name_ar,
                ).first()
                if not doctor:
                    doctor = Doctor.objects.create(
                        id=cuid(),
                        service_id=service.id,
                        name_fr=name_fr,
                        name_ar=name_ar,
                        title_fr=title_fr,
                        title_ar=title_ar,
                        photo_url=None,
                        active=True,
                        schedule_json=full_schedule,
                        morning_capacity=8,
                        evening_capacity=6,
                    )
                doctors.append(doctor)

            if reset:
                Appointment.objects.filter(
                    appointment_date__gte=day_start,
                    appointment_date__lt=day_end,
                    patient_name__startswith="[MOCK]",
                ).delete()

            current_daily_max = (
                Appointment.objects.filter(
                    appointment_date__gte=day_start,
                    appointment_date__lt=day_end,
                ).aggregate(max_daily=Max("daily_queue_number"))["max_daily"]
                or 0
            )
            next_daily_number = int(current_daily_max)

            doctor_slot_next: dict[tuple[str, str], int] = {}
            for doctor in doctors:
                for slot in (Slot.MORNING, Slot.EVENING):
                    max_doctor = (
                        Appointment.objects.filter(
                            appointment_date__gte=day_start,
                            appointment_date__lt=day_end,
                            doctor_id=doctor.id,
                            slot=slot,
                        ).aggregate(max_doc=Max("doctor_queue_number"))["max_doc"]
                        or 0
                    )
                    doctor_slot_next[(doctor.id, slot)] = int(max_doctor)

            now_local = timezone.now().astimezone(CLINIC_TIME_ZONE)

            created = 0

            def make_appt(
                doctor: Doctor,
                service: Service,
                slot: str,
                status: str,
                patient_name: str,
                patient_age: int,
                patient_phone: str,
                arrived_minutes_ago: int | None = None,
            ):
                nonlocal created, next_daily_number

                has_queue = status in {
                    AppointmentStatus.WAITING,
                    AppointmentStatus.CALLED,
                    AppointmentStatus.DONE,
                }

                doctor_q = None
                daily_q = None
                if has_queue:
                    key = (doctor.id, slot)
                    doctor_slot_next[key] += 1
                    next_daily_number += 1
                    doctor_q = doctor_slot_next[key]
                    daily_q = next_daily_number

                arrived_at = None
                if status in {AppointmentStatus.WAITING, AppointmentStatus.CALLED, AppointmentStatus.DONE}:
                    minutes = arrived_minutes_ago if arrived_minutes_ago is not None else 0
                    arrived_at = now_local - timedelta(minutes=minutes)

                Appointment.objects.create(
                    id=cuid(),
                    appointment_date=appointment_date,
                    slot=slot,
                    service_id=service.id,
                    doctor_id=doctor.id,
                    patient_name=patient_name,
                    patient_age=patient_age,
                    patient_phone=patient_phone,
                    status=status,
                    arrived_at=arrived_at,
                    doctor_queue_number=doctor_q,
                    daily_queue_number=daily_q,
                )
                created += 1

            # MORNING
            make_appt(doctors[0], services[0], Slot.MORNING, AppointmentStatus.WAITING, "[MOCK] Ahmed Benali", 37, "0555123456", 75)
            make_appt(doctors[0], services[0], Slot.MORNING, AppointmentStatus.CALLED, "[MOCK] Yasmine Khelifi", 29, "0661123456", 55)
            make_appt(doctors[0], services[0], Slot.MORNING, AppointmentStatus.BOOKED, "[MOCK] Samir Touati", 43, "0770123456", None)
            make_appt(doctors[1], services[0], Slot.MORNING, AppointmentStatus.WAITING, "[MOCK] Nadia Bouzid", 51, "0555345678", 40)
            make_appt(doctors[2], services[1], Slot.MORNING, AppointmentStatus.DONE, "[MOCK] Lina Meziane", 8, "0661456789", 95)
            make_appt(doctors[2], services[1], Slot.MORNING, AppointmentStatus.WAITING, "[MOCK] Walid Messaoud", 5, "0770234567", 20)
            make_appt(doctors[3], services[2], Slot.MORNING, AppointmentStatus.BOOKED, "[MOCK] Karim Saadi", 62, "0555765432", None)

            # EVENING
            make_appt(doctors[0], services[0], Slot.EVENING, AppointmentStatus.BOOKED, "[MOCK] Farah Ouali", 34, "0661987654", None)
            make_appt(doctors[1], services[0], Slot.EVENING, AppointmentStatus.WAITING, "[MOCK] Rachid Hamdi", 58, "0770345678", 10)
            make_appt(doctors[2], services[1], Slot.EVENING, AppointmentStatus.NO_SHOW, "[MOCK] Zakaria Djemai", 3, "0555432198", None)
            make_appt(doctors[3], services[2], Slot.EVENING, AppointmentStatus.WAITING, "[MOCK] Salima Merabet", 47, "0661321654", 15)
            make_appt(doctors[3], services[2], Slot.EVENING, AppointmentStatus.BOOKED, "[MOCK] Hakim Ait Ali", 66, "0770456123", None)

            # Keep counters in sync for admin workflows.
            if next_daily_number > 0:
                daily_counter = DailyQueueCounter.objects.filter(appointment_date=appointment_date).first()
                if daily_counter:
                    daily_counter.last_number = max(daily_counter.last_number, next_daily_number)
                    daily_counter.save(update_fields=["last_number"])
                else:
                    DailyQueueCounter.objects.create(
                        id=cuid(),
                        appointment_date=appointment_date,
                        last_number=next_daily_number,
                    )

            for (doctor_id, slot), last_value in doctor_slot_next.items():
                counter = DoctorQueueCounter.objects.filter(
                    appointment_date=appointment_date,
                    doctor_id=doctor_id,
                    slot=slot,
                ).first()
                if counter:
                    if last_value > counter.last_number:
                        counter.last_number = last_value
                        counter.save(update_fields=["last_number"])
                else:
                    DoctorQueueCounter.objects.create(
                        id=cuid(),
                        appointment_date=appointment_date,
                        doctor_id=doctor_id,
                        slot=slot,
                        last_number=last_value,
                    )

        self.stdout.write(self.style.SUCCESS(f"Mock data seeded for {date_str}."))
        self.stdout.write(self.style.SUCCESS(f"Services ready: {len(services)}"))
        self.stdout.write(self.style.SUCCESS(f"Doctors ready: {len(doctors)}"))
        self.stdout.write(self.style.SUCCESS(f"Appointments created: {created}"))
        if reset:
            self.stdout.write(self.style.WARNING("Existing [MOCK] appointments for that date were removed first (--reset)."))
