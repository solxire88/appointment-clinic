import type { ApiVideo, ApiVideoPublic } from "@/src/types/api"
import type { ClinicVideo } from "@/src/lib/types"
import { apiClient } from "@/src/lib/apiClient"
import { mapVideoAdmin, mapVideoPublic } from "@/src/lib/api/mappers"

export async function listVideos(): Promise<ClinicVideo[]> {
  const data = await apiClient.get<{ videos: ApiVideoPublic[] }>("/api/videos")
  return data.videos.map(mapVideoPublic)
}

export async function listAdminVideos(): Promise<ClinicVideo[]> {
  const data = await apiClient.get<{ videos: ApiVideo[] }>("/api/admin/videos")
  return data.videos.map(mapVideoAdmin)
}

export async function addVideo(file: File, title?: string): Promise<ClinicVideo> {
  const form = new FormData()
  form.append("file", file)
  if (title) form.append("title", title)

  const response = await fetch("/api/admin/videos/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  })

  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/admin/login"
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.error || "Upload failed"
    throw new Error(message)
  }

  const data = (await response.json()) as { video: ApiVideo }
  return mapVideoAdmin(data.video)
}

export async function updateVideo(
  id: string,
  patch: Partial<Pick<ClinicVideo, "title" | "enabled" | "order">>
): Promise<ClinicVideo> {
  const payload: Record<string, unknown> = {}
  if (patch.title !== undefined) payload.title = patch.title
  if (patch.enabled !== undefined) payload.enabled = patch.enabled
  if (patch.order !== undefined) payload.sortOrder = patch.order

  const response = await apiClient.patch<{ video: ApiVideo }>(`/api/admin/videos/${id}`, payload)
  return mapVideoAdmin(response.video)
}

export async function deleteVideo(id: string): Promise<void> {
  await apiClient.delete<{ ok: boolean }>(`/api/admin/videos/${id}`)
}

export async function reorderVideos(idsInOrder: string[]): Promise<void> {
  await apiClient.post<{ ok: boolean }>("/api/admin/videos/reorder", { idsInOrder })
}

export async function toggleVideoEnabled(id: string, enabled: boolean): Promise<void> {
  await updateVideo(id, { enabled })
}
