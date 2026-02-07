import { signIn, signOut, getSession } from "next-auth/react"

export async function signInAdmin(email: string, password: string): Promise<boolean> {
  const result = await signIn("credentials", {
    redirect: false,
    email,
    password,
  })

  return !!result?.ok
}

export async function signOutAdmin(): Promise<void> {
  await signOut({ redirect: false })
}

export async function getAdminSession() {
  return getSession()
}
