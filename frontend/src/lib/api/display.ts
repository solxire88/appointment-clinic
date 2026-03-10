import type { ApiDisplayResponse } from "@/src/types/api"
import type { DisplayData, DisplayState } from "@/src/lib/types"
import { apiClient } from "@/src/lib/apiClient"

function mapDisplayResponse(data: ApiDisplayResponse): DisplayData {
  return {
    state: data.mode || "IDLE",
    queueNumber: data.shownQueueNumber ?? undefined,
    service_fr: data.service?.nameFr,
    service_ar: data.service?.nameAr,
    doctor_fr: data.doctor?.nameFr,
    doctor_ar: data.doctor?.nameAr,
    doctorId: data.doctor?.id,
    serviceId: data.service?.id,
    updatedAt: data.updatedAt,
  }
}

export async function getDisplayState(
  lastUpdatedAt?: string
): Promise<{ changed: boolean; data: DisplayData }> {
  const url = lastUpdatedAt ? `/api/display?since=${encodeURIComponent(lastUpdatedAt)}` : "/api/display"
  const data = await apiClient.get<ApiDisplayResponse>(url)

  if (!data.changed) {
    return {
      changed: false,
      data: {
        state: "IDLE",
        updatedAt: data.updatedAt,
      },
    }
  }

  return {
    changed: true,
    data: mapDisplayResponse(data),
  }
}

export async function setDisplayState(state: DisplayState): Promise<DisplayData> {
  const response = await apiClient.post<{ display: { mode: DisplayState } }>(
    "/api/admin/display",
    { mode: state }
  )

  return {
    state: response.display.mode,
    updatedAt: new Date().toISOString(),
  }
}
