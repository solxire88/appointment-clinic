import type { ApiStatsResponse } from "@/src/types/api"
import type { DashboardStats } from "@/src/lib/types"
import { apiClient } from "@/src/lib/apiClient"

export async function getDashboardStats(date?: string): Promise<DashboardStats> {
  const url = date ? `/api/admin/stats?date=${date}` : "/api/admin/stats"
  const data = await apiClient.get<ApiStatsResponse>(url)

  const topServices = data.byService
    .map((svc) => ({ serviceId: svc.serviceId, count: svc.total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const perDoctor = data.byDoctor.map((doc) => ({
    doctorId: doc.doctorId,
    waiting: doc.WAITING,
    called: doc.CALLED,
    done: doc.DONE,
    nextWaiting: doc.nextWaitingNumber
      ? { queueNumber: doc.nextWaitingNumber, patientName: "" }
      : undefined,
  }))

  const totalToday = data.totals.total
  const morning = data.bySlot.MORNING.total
  const evening = data.bySlot.EVENING.total

  return {
    totalToday,
    morning,
    evening,
    byStatus: data.byStatus,
    topServices,
    perDoctor,
  }
}
