import type { ApiAvailabilityResponse, ApiDoctor } from "@/src/types/api"
import type { AvailableDoctor, Doctor } from "@/src/lib/types"
import { apiClient } from "@/src/lib/apiClient"
import { mapAvailabilityDoctor, mapDoctor, toApiSlot } from "@/src/lib/api/mappers"

export async function getDoctors(scope: "public" | "admin" = "public"): Promise<Doctor[]> {
  const url = scope === "admin" ? "/api/admin/doctors" : "/api/public/doctors"
  const data = await apiClient.get<{ doctors: ApiDoctor[] }>(url)
  return data.doctors.map(mapDoctor)
}

export async function getDoctorsByService(
  serviceId: string,
  scope: "public" | "admin" = "public"
): Promise<Doctor[]> {
  if (!serviceId) return []
  if (scope === "public") {
    const data = await apiClient.get<{ doctors: ApiDoctor[] }>(`/api/public/doctors?serviceId=${serviceId}`)
    return data.doctors.map(mapDoctor)
  }
  const doctors = await getDoctors("admin")
  return doctors.filter((doctor) => doctor.serviceId === serviceId)
}

export async function getDoctorById(id: string, scope: "public" | "admin" = "public"): Promise<Doctor | undefined> {
  const doctors = await getDoctors(scope)
  return doctors.find((doctor) => doctor.id === id)
}

export async function listAvailableDoctors(opts: {
  date: string
  slot: "morning" | "evening"
  serviceId: string
}): Promise<AvailableDoctor[]> {
  const slot = toApiSlot(opts.slot)
  const data = await apiClient.get<ApiAvailabilityResponse>(
    `/api/public/availability?date=${opts.date}&slot=${slot}&serviceId=${opts.serviceId}`
  )
  return data.doctors.map((doc) => mapAvailabilityDoctor(doc, { serviceId: opts.serviceId, slot: opts.slot }))
}

export async function createDoctor(data: Omit<Doctor, "id">): Promise<Doctor> {
  const photoUrl = data.photoUrl?.trim()
  const payload = {
    serviceId: data.serviceId,
    nameFr: data.name_fr,
    nameAr: data.name_ar,
    titleFr: data.title_fr,
    titleAr: data.title_ar,
    photoUrl: photoUrl || "",
    scheduleJson: data.schedule,
    morningCapacity: data.capacityMorning,
    eveningCapacity: data.capacityEvening,
    active: true,
  }
  const response = await apiClient.post<{ doctor: ApiDoctor }>("/api/admin/doctors", payload)
  return mapDoctor(response.doctor)
}

export async function updateDoctor(id: string, data: Partial<Doctor>): Promise<Doctor> {
  const payload: Record<string, unknown> = {}
  if (data.serviceId !== undefined) payload.serviceId = data.serviceId
  if (data.name_fr !== undefined) payload.nameFr = data.name_fr
  if (data.name_ar !== undefined) payload.nameAr = data.name_ar
  if (data.title_fr !== undefined) payload.titleFr = data.title_fr
  if (data.title_ar !== undefined) payload.titleAr = data.title_ar
  if (data.photoUrl !== undefined) payload.photoUrl = data.photoUrl || ""
  if (data.schedule !== undefined) payload.scheduleJson = data.schedule
  if (data.capacityMorning !== undefined) payload.morningCapacity = data.capacityMorning
  if (data.capacityEvening !== undefined) payload.eveningCapacity = data.capacityEvening

  const response = await apiClient.patch<{ doctor: ApiDoctor }>(`/api/admin/doctors/${id}`, payload)
  return mapDoctor(response.doctor)
}

export async function deleteDoctor(id: string): Promise<void> {
  await apiClient.delete<{ ok: boolean }>(`/api/admin/doctors/${id}`)
}
