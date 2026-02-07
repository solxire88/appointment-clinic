"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/src/lib/i18n/context"
import { signInAdmin } from "@/src/lib/api/auth"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/clinic/language-switcher"
import { BrandLogo } from "@/components/BrandLogo"

export default function AdminLoginPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { status } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin/dashboard")
    }
  }, [router, status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await signInAdmin(email, password)
    if (ok) {
      router.push("/admin/dashboard")
    } else {
      setError(true)
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
                onChange={(e) => { setEmail(e.target.value); setError(false) }}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-password">{t("admin_password")}</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false) }}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{t("validation_required")}</p>
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
