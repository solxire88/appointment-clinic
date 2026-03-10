import type {
  ApiAppointment,
  ApiAppointmentTicket,
  ApiCreateAppointmentResponse,
} from "@/src/types/api"
import type {
  Appointment,
  AppointmentSlot,
  AppointmentStatus,
  AvailableDoctor,
} from "@/src/lib/types"
import { apiClient, ApiError } from "@/src/lib/apiClient"
import { mapAppointment, fromApiSlot, toApiSlot } from "@/src/lib/api/mappers"
import { getClinicDateString } from "@/src/lib/utils/clinic-date"
import { listAvailableDoctors } from "@/src/lib/api/doctors"

export async function getAppointments(filters?: {
  date?: string
  slot?: AppointmentSlot
  serviceId?: string
  status?: AppointmentStatus
  doctorId?: string
}): Promise<Appointment[]> {
  const date = filters?.date || getClinicDateString()
  const params = new URLSearchParams({ date })
  if (filters?.slot) params.set("slot", toApiSlot(filters.slot))
  if (filters?.serviceId) params.set("serviceId", filters.serviceId)
  if (filters?.status) params.set("status", filters.status)
  if (filters?.doctorId) params.set("doctorId", filters.doctorId)

  const data = await apiClient.get<{ appointments: ApiAppointment[] }>(
    `/api/admin/appointments?${params.toString()}`
  )

  return data.appointments.map(mapAppointment)
}

export async function getTodayAppointments(): Promise<Appointment[]> {
  return getAppointments({ date: getClinicDateString() })
}

export async function getSlotAvailability(
  date: string,
  serviceId: string
): Promise<{
  morning: { count: number; capacity: number; full: boolean }
  evening: { count: number; capacity: number; full: boolean }
}> {
  if (!serviceId) {
    return {
      morning: { count: 0, capacity: 0, full: true },
      evening: { count: 0, capacity: 0, full: true },
    }
  }

  const [morning, evening] = await Promise.all([
    listAvailableDoctors({ date, slot: "morning", serviceId }),
    listAvailableDoctors({ date, slot: "evening", serviceId }),
  ])

  const buildSummary = (available: AvailableDoctor[], slot: "morning" | "evening") => {
    const totalCapacity = available.reduce((sum, a) => {
      const cap = slot === "morning" ? a.doctor.capacityMorning : a.doctor.capacityEvening
      return sum + (cap || 0)
    }, 0)
    const totalRemaining = available.reduce((sum, a) => sum + a.remainingCapacity, 0)
    const count = Math.max(totalCapacity - totalRemaining, 0)
    return {
      count,
      capacity: totalCapacity,
      full: totalRemaining <= 0,
    }
  }

  return {
    morning: buildSummary(morning, "morning"),
    evening: buildSummary(evening, "evening"),
  }
}

export async function createAppointment(input: {
  date: string
  slot: AppointmentSlot
  serviceId: string
  doctorId: string
  patientName: string
  patientAge: number
  patientPhone: string
  middleName?: string
  startedAtMs?: number
}): Promise<{ appointment: Appointment; queueNumber: number | null; dailyQueueNumber?: number | null }> {
  try {
    const response = await apiClient.post<ApiCreateAppointmentResponse>("/api/appointments", {
      appointmentDate: input.date,
      slot: toApiSlot(input.slot),
      serviceId: input.serviceId,
      doctorId: input.doctorId,
      patientName: input.patientName,
      patientAge: input.patientAge,
      patientPhone: input.patientPhone,
      middleName: input.middleName,
      startedAtMs: input.startedAtMs,
    })

    return {
      appointment: mapAppointment(response.appointment),
      queueNumber: response.ticket.doctorQueueNumber,
      dailyQueueNumber: response.ticket.dailyQueueNumber ?? null,
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "SLOT_FULL" || error.status === 409) {
        throw new Error("SLOT_FULL")
      }
      if (error.code === "BOT_SUSPECTED") {
        throw new Error("BOT_SUSPECTED")
      }
      if (error.code === "TOO_MANY_REQUESTS" || error.status === 429) {
        throw new Error("TOO_MANY_REQUESTS")
      }
    }
    throw error
  }
}

export async function createAdminAppointment(input: {
  date: string
  slot: AppointmentSlot
  serviceId: string
  doctorId: string
  patientName: string
  patientAge: number
  patientPhone: string
  queueNumber?: number | null
  status?: AppointmentStatus
}): Promise<Appointment> {
  try {
    const response = await apiClient.post<{ appointment: ApiAppointment }>("/api/admin/appointments", {
      appointmentDate: input.date,
      slot: toApiSlot(input.slot),
      serviceId: input.serviceId,
      doctorId: input.doctorId,
      patientName: input.patientName,
      patientAge: input.patientAge,
      patientPhone: input.patientPhone,
      queueNumber: input.queueNumber,
      status: input.status,
    })

    return mapAppointment(response.appointment)
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "SLOT_FULL" || error.status === 409) {
        throw new Error("SLOT_FULL")
      }
      if (error.code === "QUEUE_NUMBER_TAKEN") {
        throw new Error("QUEUE_NUMBER_TAKEN")
      }
      if (error.status === 400 && error.message.includes("scheduled")) {
        throw new Error("SCHEDULE_UNAVAILABLE")
      }
    }
    throw error
  }
}

export async function getAppointmentTicket(id: string): Promise<ApiAppointmentTicket> {
  return apiClient.get<ApiAppointmentTicket>(`/api/appointments/${id}`)
}

export async function updateAppointment(
  id: string,
  data: {
    date?: string
    slot?: AppointmentSlot
    serviceId?: string
    doctorId?: string
    patientName?: string
    patientAge?: number
    patientPhone?: string
    queueNumber?: number | null
    status?: AppointmentStatus
  }
): Promise<Appointment> {
  try {
    const payload: Record<string, unknown> = {}
    if (data.date !== undefined) payload.appointmentDate = data.date
    if (data.slot !== undefined) payload.slot = toApiSlot(data.slot)
    if (data.serviceId !== undefined) payload.serviceId = data.serviceId
    if (data.doctorId !== undefined) payload.doctorId = data.doctorId
    if (data.patientName !== undefined) payload.patientName = data.patientName
    if (data.patientAge !== undefined) payload.patientAge = data.patientAge
    if (data.patientPhone !== undefined) payload.patientPhone = data.patientPhone
    if (data.queueNumber !== undefined) payload.queueNumber = data.queueNumber
    if (data.status !== undefined) payload.status = data.status

    const response = await apiClient.patch<{ appointment: ApiAppointment }>(
      `/api/admin/appointments/${id}`,
      payload
    )

    return mapAppointment(response.appointment)
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "SLOT_FULL" || error.status === 409) {
        throw new Error("SLOT_FULL")
      }
      if (error.code === "QUEUE_NUMBER_TAKEN") {
        throw new Error("QUEUE_NUMBER_TAKEN")
      }
      if (error.status === 400 && error.message.includes("scheduled")) {
        throw new Error("SCHEDULE_UNAVAILABLE")
      }
    }
    throw error
  }
}

export async function deleteAppointment(id: string): Promise<void> {
  await apiClient.delete<{ ok: boolean }>(`/api/admin/appointments/${id}`)
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<Appointment> {
  const response = await apiClient.patch<{ appointment: ApiAppointment }>(
    `/api/admin/appointments/${id}`,
    { status }
  )
  return mapAppointment(response.appointment)
}

export async function callNextForDoctor(params: {
  doctorId: string
  date: string
  slot: AppointmentSlot
}): Promise<Appointment | null> {
  try {
    const response = await apiClient.post<{
      appointment: ApiAppointment | null
    }>("/api/admin/waiting-room/call-next", {
      appointmentDate: params.date,
      slot: toApiSlot(params.slot),
      doctorId: params.doctorId,
    })

    if (!response.appointment) return null
    return mapAppointment(response.appointment)
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_WAITING") {
      throw new Error("NOT_WAITING")
    }
    throw error
  }
}

export async function callSpecificForDoctor(appointmentId: string): Promise<Appointment> {
  try {
    const response = await apiClient.post<{
      appointment: ApiAppointment
    }>("/api/admin/waiting-room/call-specific", {
      appointmentId,
    })

    return mapAppointment(response.appointment)
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_WAITING") {
      throw new Error("NOT_WAITING")
    }
    throw error
  }
}

export function apiSlotToLabel(slot: "MORNING" | "EVENING"): AppointmentSlot {
  return fromApiSlot(slot)
}
