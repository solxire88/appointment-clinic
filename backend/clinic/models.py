from __future__ import annotations

from django.db import models


class Slot(models.TextChoices):
    MORNING = "MORNING", "MORNING"
    EVENING = "EVENING", "EVENING"


class AppointmentStatus(models.TextChoices):
    BOOKED = "BOOKED", "BOOKED"
    WAITING = "WAITING", "WAITING"
    CALLED = "CALLED", "CALLED"
    DONE = "DONE", "DONE"
    NO_SHOW = "NO_SHOW", "NO_SHOW"


class DisplayMode(models.TextChoices):
    IDLE = "IDLE", "IDLE"
    CALLING = "CALLING", "CALLING"
    OFF = "OFF", "OFF"


class Service(models.Model):
    id = models.CharField(primary_key=True, max_length=191)
    name_fr = models.CharField(max_length=191, db_column="nameFr")
    name_ar = models.CharField(max_length=191, db_column="nameAr")
    description_fr = models.TextField(db_column="descriptionFr")
    description_ar = models.TextField(db_column="descriptionAr")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(db_column="createdAt", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updatedAt", auto_now=True)

    class Meta:
        managed = False
        db_table = "Service"


class Doctor(models.Model):
    id = models.CharField(primary_key=True, max_length=191)
    service = models.ForeignKey(Service, on_delete=models.DO_NOTHING, db_column="serviceId", related_name="doctors")
    name_fr = models.CharField(max_length=191, db_column="nameFr")
    name_ar = models.CharField(max_length=191, db_column="nameAr")
    title_fr = models.CharField(max_length=191, db_column="titleFr")
    title_ar = models.CharField(max_length=191, db_column="titleAr")
    photo_url = models.TextField(blank=True, null=True, db_column="photoUrl")
    active = models.BooleanField(default=True)
    schedule_json = models.JSONField(db_column="scheduleJson")
    morning_capacity = models.IntegerField(default=0, db_column="morningCapacity")
    evening_capacity = models.IntegerField(default=0, db_column="eveningCapacity")
    created_at = models.DateTimeField(db_column="createdAt", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updatedAt", auto_now=True)

    class Meta:
        managed = False
        db_table = "Doctor"


class Appointment(models.Model):
    id = models.CharField(primary_key=True, max_length=191)
    appointment_date = models.DateTimeField(db_column="appointmentDate")
    slot = models.CharField(max_length=20, choices=Slot.choices)
    service = models.ForeignKey(Service, on_delete=models.DO_NOTHING, db_column="serviceId", related_name="appointments")
    doctor = models.ForeignKey(Doctor, on_delete=models.DO_NOTHING, db_column="doctorId", related_name="appointments")
    patient_name = models.CharField(max_length=191, db_column="patientName")
    patient_age = models.IntegerField(db_column="patientAge")
    patient_phone = models.CharField(max_length=191, db_column="patientPhone")
    status = models.CharField(max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.BOOKED)
    arrived_at = models.DateTimeField(blank=True, null=True, db_column="arrivedAt")
    doctor_queue_number = models.IntegerField(blank=True, null=True, db_column="doctorQueueNumber")
    daily_queue_number = models.IntegerField(blank=True, null=True, db_column="dailyQueueNumber")
    created_at = models.DateTimeField(db_column="createdAt", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updatedAt", auto_now=True)

    class Meta:
        managed = False
        db_table = "Appointment"


class DoctorQueueCounter(models.Model):
    id = models.CharField(primary_key=True, max_length=191)
    appointment_date = models.DateTimeField(db_column="appointmentDate")
    doctor = models.ForeignKey(Doctor, on_delete=models.DO_NOTHING, db_column="doctorId", related_name="queue_counters")
    slot = models.CharField(max_length=20, choices=Slot.choices)
    last_number = models.IntegerField(default=0, db_column="lastNumber")

    class Meta:
        managed = False
        db_table = "DoctorQueueCounter"


class DailyQueueCounter(models.Model):
    id = models.CharField(primary_key=True, max_length=191)
    appointment_date = models.DateTimeField(unique=True, db_column="appointmentDate")
    last_number = models.IntegerField(default=0, db_column="lastNumber")

    class Meta:
        managed = False
        db_table = "DailyQueueCounter"


class DisplayState(models.Model):
    id = models.CharField(primary_key=True, max_length=191)
    mode = models.CharField(max_length=20, choices=DisplayMode.choices, default=DisplayMode.IDLE)
    appointment_id = models.CharField(max_length=191, blank=True, null=True, db_column="appointmentId")
    doctor_id = models.CharField(max_length=191, blank=True, null=True, db_column="doctorId")
    service_id = models.CharField(max_length=191, blank=True, null=True, db_column="serviceId")
    shown_queue_number = models.IntegerField(blank=True, null=True, db_column="shownQueueNumber")
    updated_at = models.DateTimeField(db_column="updatedAt", auto_now=True)

    class Meta:
        managed = False
        db_table = "DisplayState"


class AdminUser(models.Model):
    id = models.CharField(primary_key=True, max_length=191)
    email = models.CharField(max_length=191, unique=True)
    password_hash = models.CharField(max_length=191, db_column="passwordHash")
    role = models.CharField(max_length=191, default="ADMIN")
    created_at = models.DateTimeField(db_column="createdAt", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updatedAt", auto_now=True)

    class Meta:
        managed = False
        db_table = "AdminUser"


class ClinicVideo(models.Model):
    id = models.CharField(primary_key=True, max_length=191)
    title = models.CharField(max_length=191)
    filename = models.CharField(max_length=191)
    mime_type = models.CharField(max_length=191, db_column="mimeType")
    size_bytes = models.IntegerField(db_column="sizeBytes")
    enabled = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0, db_column="sortOrder")
    created_at = models.DateTimeField(db_column="createdAt", auto_now_add=True)
    updated_at = models.DateTimeField(db_column="updatedAt", auto_now=True)

    class Meta:
        managed = False
        db_table = "ClinicVideo"
