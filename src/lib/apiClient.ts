import type { ApiErrorPayload } from "@/src/types/api"
import { clearAdminToken, getAdminToken } from "@/src/lib/auth-storage"
import { resolveApiUrl } from "@/src/lib/apiBase"

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE"

type RequestOptions = {
  method?: ApiMethod
  body?: unknown
  headers?: HeadersInit
  redirectOn401?: boolean
  signal?: AbortSignal
  skipAuth?: boolean
}

export class ApiError extends Error {
  status: number
  code?: string
  url?: string

  constructor(message: string, status: number, code?: string, url?: string) {
    super(url ? `${message} (${url})` : message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.url = url
  }
}

async function parseJsonSafe(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers, redirectOn401 = true, signal, skipAuth = false } = options
  const requestUrl = resolveApiUrl(url)
  const token = skipAuth ? null : getAdminToken()
  const isAdminRoute = url.startsWith("/api/admin")

  const response = await fetch(requestUrl, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token && isAdminRoute ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "omit",
    signal,
  })

  if (response.status === 401 && redirectOn401 && typeof window !== "undefined") {
    if (isAdminRoute) {
      clearAdminToken()
      window.location.href = "/admin/login"
    }
  }

  if (!response.ok) {
    const payload = (await parseJsonSafe(response)) as ApiErrorPayload | null
    const message = payload?.error || response.statusText || "Request failed"
    throw new ApiError(message, response.status, payload?.code, requestUrl)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: "GET" }),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "POST", body }),
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "PATCH", body }),
  delete: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: "DELETE" }),
}
