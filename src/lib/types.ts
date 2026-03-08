export type Locale = "fr" | "ar"

export interface Service {
  id: string
  name_fr: string
  name_ar: string
  description_fr: string
  description_ar: string
  icon: string
}

export interface DaySlots {
  morning: boolean
  evening: boolean
  morningCapacity: number
  eveningCapacity: number
}

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

export type WeeklySchedule = Record<WeekDay, DaySlots>

export interface Doctor {
  id: string
  name_fr: string
  name_ar: string
  title_fr: string
  title_ar: string
  serviceId: string
  photoUrl?: string
  schedule: WeeklySchedule
  capacityMorning: number
  capacityEvening: number
}

export type AppointmentSlot = "morning" | "evening"
export type AppointmentStatus = "BOOKED" | "WAITING" | "CALLED" | "DONE" | "NO_SHOW"

export interface Appointment {
  id: string
  date: string
  slot: AppointmentSlot
  serviceId: string
  doctorId: string
  patientName: string
  patientAge: number
  patientPhone: string
  status: AppointmentStatus
  arrivedAt?: string | null
  queueNumber: number | null
  dailyQueueNumber?: number | null
  createdAt: string
}

export interface CreateAppointmentInput {
  date: string
  slot: AppointmentSlot
  serviceId: string
  doctorId: string
  patientName: string
  patientAge: number
  patientPhone: string
}

export interface UpdateAppointmentInput {
  date?: string
  slot?: AppointmentSlot
  serviceId?: string
  doctorId?: string
  patientName?: string
  patientAge?: number
  patientPhone?: string
  status?: AppointmentStatus
}

export type DisplayState = "IDLE" | "CALLING" | "OFF"

export interface DisplayData {
  state: DisplayState
  queueNumber?: number
  service_fr?: string
  service_ar?: string
  doctor_fr?: string
  doctor_ar?: string
  doctorId?: string
  serviceId?: string
  updatedAt: string
}

export interface SlotCapacity {
  morning: number
  evening: number
}

export interface ClinicVideo {
  id: string
  title: string
  src: string
  enabled: boolean
  order: number
  createdAt: string
}

export interface DashboardStats {
  totalToday: number
  morning: number
  evening: number
  byStatus: Record<AppointmentStatus, number>
  topServices: { serviceId: string; count: number }[]
  perDoctor: {
    doctorId: string
    waiting: number
    called: number
    done: number
    nextWaiting?: { patientName: string }
  }[]
}

export interface AvailableDoctor {
  doctor: Doctor
  remainingCapacity: number
}

export const WEEK_DAYS: WeekDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

export const DEFAULT_SCHEDULE: WeeklySchedule = {
  mon: { morning: true, evening: true, morningCapacity: 10, eveningCapacity: 8 },
  tue: { morning: true, evening: true, morningCapacity: 10, eveningCapacity: 8 },
  wed: { morning: true, evening: true, morningCapacity: 10, eveningCapacity: 8 },
  thu: { morning: true, evening: true, morningCapacity: 10, eveningCapacity: 8 },
  fri: { morning: false, evening: false, morningCapacity: 0, eveningCapacity: 0 },
  sat: { morning: true, evening: false, morningCapacity: 10, eveningCapacity: 0 },
  sun: { morning: false, evening: false, morningCapacity: 0, eveningCapacity: 0 },
}
