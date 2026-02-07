import type {
  ApiAppointment,
  ApiAvailabilityDoctor,
  ApiDoctor,
  ApiService,
  ApiVideo,
  ApiVideoPublic,
} from "@/src/types/api"
import type {
  Appointment,
  AppointmentSlot,
  AvailableDoctor,
  ClinicVideo,
  Doctor,
  Service,
  WeeklySchedule,
} from "@/src/lib/types"
import { DEFAULT_SCHEDULE } from "@/src/lib/types"
import { formatClinicDateFromIso } from "@/src/lib/utils/clinic-date"

const DEFAULT_ICON = "activity"

export function toApiSlot(slot: AppointmentSlot): "MORNING" | "EVENING" {
  return slot === "morning" ? "MORNING" : "EVENING"
}

export function fromApiSlot(slot: "MORNING" | "EVENING"): AppointmentSlot {
  return slot === "MORNING" ? "morning" : "evening"
}

export function mapService(api: ApiService): Service {
  return {
    id: api.id,
    name_fr: api.nameFr,
    name_ar: api.nameAr,
    description_fr: api.descriptionFr,
    description_ar: api.descriptionAr,
    icon: DEFAULT_ICON,
  }
}

export function mapDoctor(api: ApiDoctor): Doctor {
  return {
    id: api.id,
    name_fr: api.nameFr,
    name_ar: api.nameAr,
    title_fr: api.titleFr,
    title_ar: api.titleAr,
    serviceId: api.serviceId,
    photoUrl: api.photoUrl || undefined,
    schedule: api.scheduleJson as WeeklySchedule,
    capacityMorning: api.morningCapacity,
    capacityEvening: api.eveningCapacity,
  }
}

export function mapAppointment(api: ApiAppointment): Appointment {
  return {
    id: api.id,
    date: formatClinicDateFromIso(api.appointmentDate),
    slot: fromApiSlot(api.slot),
    serviceId: api.serviceId,
    doctorId: api.doctorId,
    patientName: api.patientName,
    patientAge: api.patientAge,
    patientPhone: api.patientPhone,
    status: api.status,
    queueNumber: api.doctorQueueNumber,
    dailyQueueNumber: api.dailyQueueNumber ?? null,
    createdAt: api.createdAt,
  }
}

export function mapAvailabilityDoctor(
  api: ApiAvailabilityDoctor,
  params: { serviceId: string; slot: AppointmentSlot }
): AvailableDoctor {
  const schedule = { ...DEFAULT_SCHEDULE } as WeeklySchedule
  return {
    doctor: {
      id: api.id,
      name_fr: api.nameFr,
      name_ar: api.nameAr,
      title_fr: api.titleFr,
      title_ar: api.titleAr,
      serviceId: params.serviceId,
      photoUrl: api.photoUrl || undefined,
      schedule,
      capacityMorning: params.slot === "morning" ? api.capacity : 0,
      capacityEvening: params.slot === "evening" ? api.capacity : 0,
    },
    remainingCapacity: api.remaining,
  }
}

export function mapVideoPublic(api: ApiVideoPublic): ClinicVideo {
  return {
    id: api.id,
    title: api.title,
    src: api.url,
    enabled: true,
    order: api.sortOrder,
    createdAt: new Date().toISOString(),
  }
}

export function mapVideoAdmin(api: ApiVideo): ClinicVideo {
  return {
    id: api.id,
    title: api.title,
    src: `/api/videos/file/${api.id}`,
    enabled: api.enabled,
    order: api.sortOrder,
    createdAt: api.createdAt,
  }
}
