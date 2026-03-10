"use client"

import { Phone, Mail } from "lucide-react"
import { useI18n } from "@/src/lib/i18n/context"

export function TopBar() {
  const { t } = useI18n()

  return (
    <div className="bg-clinic-deep text-primary-foreground">
      <div className="container mx-auto flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-4">
          <a href="tel:+21300000000" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <Phone className="h-3.5 w-3.5" />
            <span>{t("topbar_phone")}</span>
          </a>
          <a href="mailto:contact@cliniquemrabeut.dz" className="hidden sm:flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <Mail className="h-3.5 w-3.5" />
            <span>{t("topbar_email")}</span>
          </a>
        </div>
      </div>
    </div>
  )
}
