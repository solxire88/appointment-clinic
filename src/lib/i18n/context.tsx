"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { translations, type Locale, type TranslationKey } from "./translations"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
  dir: "ltr" | "rtl"
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr")

  useEffect(() => {
    const saved = localStorage.getItem("clinic-locale") as Locale | null
    if (saved && (saved === "fr" || saved === "ar")) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("clinic-locale", newLocale)
  }, [])

  const t = useCallback(
    (key: TranslationKey) => {
      return translations[locale][key] || translations.fr[key] || key
    },
    [locale]
  )

  const dir = locale === "ar" ? "rtl" : "ltr"

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir)
    document.documentElement.setAttribute("lang", locale)
  }, [dir, locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
