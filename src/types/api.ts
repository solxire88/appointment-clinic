export type ApiSlot = "MORNING" | "EVENING"
export type ApiAppointmentStatus = "BOOKED" | "WAITING" | "CALLED" | "DONE" | "NO_SHOW"
export type ApiDisplayMode = "IDLE" | "CALLING" | "OFF"

export interface ApiService {
  id: string
  nameFr: string
  nameAr: string
  descriptionFr: string
  descriptionAr: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiDoctor {
  id: string
  serviceId: string
  nameFr: string
  nameAr: string
  titleFr: string
  titleAr: string
  photoUrl?: string | null
  active: boolean
  scheduleJson: Record<
    string,
    {
      morning: boolean
      evening: boolean
      morningCapacity?: number
      eveningCapacity?: number
    }
  >
  morningCapacity: number
  eveningCapacity: number
  createdAt: string
  updatedAt: string
  service?: ApiService
}

export interface ApiAppointment {
  id: string
  appointmentDate: string
  slot: ApiSlot
  serviceId: string
  doctorId: string
  patientName: string
  patientAge: number
  patientPhone: string
  status: ApiAppointmentStatus
  arrivedAt?: string | null
  doctorQueueNumber: number | null
  dailyQueueNumber?: number | null
  createdAt: string
  updatedAt: string
  doctor?: Pick<ApiDoctor, "id" | "nameFr" | "nameAr" | "titleFr" | "titleAr" | "photoUrl"> | null
  service?: Pick<ApiService, "id" | "nameFr" | "nameAr"> | null
}

export interface ApiAvailabilityDoctor {
  id: string
  nameFr: string
  nameAr: string
  titleFr: string
  titleAr: string
  photoUrl?: string | null
  capacity: number
  remaining: number
}

export interface ApiAvailabilityResponse {
  date: string
  slot: ApiSlot
  serviceId: string
  doctors: ApiAvailabilityDoctor[]
}

export interface ApiCreateAppointmentResponse {
  appointment: ApiAppointment
  ticket: { doctorQueueNumber: number | null; dailyQueueNumber?: number | null }
}

export interface ApiAppointmentTicket {
  id: string
  appointmentDate: string
  slot: ApiSlot
  doctorQueueNumber: number | null
  dailyQueueNumber?: number | null
  doctor: { id: string; nameFr: string; nameAr: string; titleFr: string; titleAr: string; photoUrl?: string | null }
  service: { id: string; nameFr: string; nameAr: string }
  patientName: string
  patientPhone: string
}

export interface ApiDisplayResponse {
  changed: boolean
  updatedAt: string
  mode?: ApiDisplayMode
  shownQueueNumber?: number | null
  doctor?: { id: string; nameFr: string; nameAr: string } | null
  service?: { id: string; nameFr: string; nameAr: string } | null
}

export interface ApiVideoPublic {
  id: string
  title: string
  url: string
  sortOrder: number
}

export interface ApiVideo {
  id: string
  title: string
  filename: string
  mimeType: string
  sizeBytes: number
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ApiStatsResponse {
  date: string
  totals: {
    total: number
    BOOKED: number
    WAITING: number
    CALLED: number
    DONE: number
    NO_SHOW: number
  }
  byStatus: Record<ApiAppointmentStatus, number>
  bySlot: Record<
    ApiSlot,
    {
      BOOKED: number
      WAITING: number
      CALLED: number
      DONE: number
      NO_SHOW: number
      total: number
    }
  >
  byService: Array<{ id?: string; nameFr?: string; nameAr?: string; serviceId: string; total: number }>
  byDoctor: Array<{
    doctorId: string
    id?: string
    nameFr?: string
    nameAr?: string
    WAITING: number
    CALLED: number
    DONE: number
    nextWaitingNumber: number | null
    nextWaitingPatientName?: string | null
  }>
}

export interface ApiErrorPayload {
  error: string
  code?: string
}
