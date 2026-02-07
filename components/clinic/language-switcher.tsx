"use client"

import { useI18n } from "@/src/lib/i18n/context"
import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLocale(locale === "fr" ? "ar" : "fr")}
      className="gap-1.5 border-border text-foreground"
    >
      <Languages className="h-4 w-4" />
      <span>{locale === "fr" ? "AR" : "FR"}</span>
    </Button>
  )
}
