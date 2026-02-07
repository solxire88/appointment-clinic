const AUTH_KEY = "clinic-admin-auth"

export function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(AUTH_KEY) === "true"
}

export function adminLogin(email: string, password: string): boolean {
  // Mock authentication - accept any email/password
  if (email && password) {
    localStorage.setItem(AUTH_KEY, "true")
    return true
  }
  return false
}

export function adminLogout(): void {
  localStorage.removeItem(AUTH_KEY)
}
