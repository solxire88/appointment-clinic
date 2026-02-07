import type { ApiService } from "@/src/types/api"
import type { Service } from "@/src/lib/types"
import { apiClient } from "@/src/lib/apiClient"
import { mapService } from "@/src/lib/api/mappers"

export async function getServices(scope: "public" | "admin" = "public"): Promise<Service[]> {
  const url = scope === "admin" ? "/api/admin/services" : "/api/public/services"
  const data = await apiClient.get<{ services: ApiService[] }>(url)
  return data.services.map(mapService)
}

export async function getServiceById(id: string, scope: "public" | "admin" = "public"): Promise<Service | undefined> {
  const services = await getServices(scope)
  return services.find((service) => service.id === id)
}

export async function createService(data: Omit<Service, "id">): Promise<Service> {
  const payload = {
    nameFr: data.name_fr,
    nameAr: data.name_ar,
    descriptionFr: data.description_fr,
    descriptionAr: data.description_ar,
    active: true,
  }
  const response = await apiClient.post<{ service: ApiService }>("/api/admin/services", payload)
  return mapService(response.service)
}

export async function updateService(id: string, data: Partial<Service>): Promise<Service> {
  const payload: Record<string, unknown> = {}
  if (data.name_fr !== undefined) payload.nameFr = data.name_fr
  if (data.name_ar !== undefined) payload.nameAr = data.name_ar
  if (data.description_fr !== undefined) payload.descriptionFr = data.description_fr
  if (data.description_ar !== undefined) payload.descriptionAr = data.description_ar

  const response = await apiClient.patch<{ service: ApiService }>(`/api/admin/services/${id}`, payload)
  return mapService(response.service)
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.delete<{ ok: boolean }>(`/api/admin/services/${id}`)
}
