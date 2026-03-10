import { clearAdminToken, getAdminToken, setAdminToken } from "@/src/lib/auth-storage"
import { resolveApiUrl } from "@/src/lib/apiBase"

type SessionUser = {
  id: string
  email: string
  role: string
}

type LoginResponse = {
  token: string
  user: SessionUser
}

type SessionResponse = {
  user: SessionUser
}

type LoginResult = {
  ok: boolean
  error?: string
}

export async function signInAdmin(email: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch(resolveApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "omit",
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      clearAdminToken()
      return { ok: false, error: payload?.error || "Email ou mot de passe invalide." }
    }

    const data = (await response.json()) as LoginResponse
    if (!data.token) return { ok: false, error: "Email ou mot de passe invalide." }
    setAdminToken(data.token)
    return { ok: true }
  } catch {
    clearAdminToken()
    return { ok: false, error: "Impossible de joindre le serveur API." }
  }
}

export async function signOutAdmin(): Promise<void> {
  const token = getAdminToken()
  clearAdminToken()

  if (!token) return

  await fetch(resolveApiUrl("/api/auth/logout"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "omit",
  }).catch(() => null)
}

export async function getAdminSession(): Promise<SessionResponse | null> {
  const token = getAdminToken()
  if (!token) return null

  const response = await fetch(resolveApiUrl("/api/auth/session"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "omit",
  })

  if (!response.ok) {
    clearAdminToken()
    return null
  }

  return (await response.json()) as SessionResponse
}
