"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/src/lib/i18n/context"
import { getAdminSession, signInAdmin } from "@/src/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/clinic/language-switcher"
import { BrandLogo } from "@/components/BrandLogo"

export default function AdminLoginPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getAdminSession().then((session) => {
      if (!mounted) return
      if (session?.user) {
        router.replace("/admin/dashboard")
      }
    })
    return () => {
      mounted = false
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signInAdmin(email, password)
    if (result.ok) {
      router.push("/admin/dashboard")
    } else {
      setError(result.error || "Connexion impossible.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-soft p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <BrandLogo size="md" variant="default" className="mx-auto mb-4" priority />
          <CardTitle className="text-foreground">{t("admin_login_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-email">{t("admin_email")}</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null) }}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-password">{t("admin_password")}</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
              {t("admin_login")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
