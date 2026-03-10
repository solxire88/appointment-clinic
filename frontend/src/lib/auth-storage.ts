const ADMIN_TOKEN_KEY = "clinic_admin_token"

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export { ADMIN_TOKEN_KEY }
