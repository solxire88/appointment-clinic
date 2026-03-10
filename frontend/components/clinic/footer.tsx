"use client"

import { useI18n } from "@/src/lib/i18n/context"
import { Phone, Mail } from "lucide-react"
import { BrandLogo } from "@/components/BrandLogo"

export function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3 rtl:flex-row-reverse">
            <BrandLogo size="sm" variant="icon" className="shrink-0" />
            <div>
              <p className="font-semibold leading-tight">{t("footer_clinic_name")}</p>
            </div>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-6 text-sm opacity-80">
            <a href="tel:+21300000000" className="flex items-center gap-1.5 hover:opacity-100 transition-opacity">
              <Phone className="h-3.5 w-3.5" />
              <span>{t("topbar_phone")}</span>
            </a>
            <a href="mailto:contact@cliniquemrabeut.dz" className="flex items-center gap-1.5 hover:opacity-100 transition-opacity">
              <Mail className="h-3.5 w-3.5" />
              <span>{t("topbar_email")}</span>
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-background/20 text-center text-sm opacity-60">
          <p>&copy; {year} {t("footer_clinic_name")}. {t("footer_rights")}.</p>
        </div>
      </div>
    </footer>
  )
}
