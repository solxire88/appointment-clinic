"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useI18n } from "@/src/lib/i18n/context"
import { getDoctors } from "@/src/lib/api/doctors"
import { getServices } from "@/src/lib/api/services"
import type { Doctor, Service } from "@/src/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import Image from "next/image"
import type { WeekDay, Locale } from "@/src/lib/types"
import { WEEK_DAYS } from "@/src/lib/types"

const DAY_LABELS_FR: Record<WeekDay, string> = { mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam", sun: "Dim" }
const DAY_LABELS_AR: Record<WeekDay, string> = { mon: "\u0627\u062B\u0646", tue: "\u062B\u0644\u0627", wed: "\u0623\u0631\u0628", thu: "\u062E\u0645\u064A", fri: "\u062C\u0645\u0639", sat: "\u0633\u0628\u062A", sun: "\u0623\u062D\u062F" }

function getScheduleSnippet(doc: Doctor, loc: Locale): string {
  const dayLabels = loc === "ar" ? DAY_LABELS_AR : DAY_LABELS_FR
  const mLabel = loc === "ar" ? "\u0635" : "M"
  const eLabel = loc === "ar" ? "\u0645" : "S"
  const sep = loc === "ar" ? "\u0648" : "+"

  // Group consecutive days with same pattern
  const groups: { days: WeekDay[]; morning: boolean; evening: boolean }[] = []
  for (const day of WEEK_DAYS) {
    const s = doc.schedule[day]
    if (!s.morning && !s.evening) continue
    const last = groups[groups.length - 1]
    if (last && last.morning === s.morning && last.evening === s.evening) {
      last.days.push(day)
    } else {
      groups.push({ days: [day], morning: s.morning, evening: s.evening })
    }
  }

  return groups.map((g) => {
    const dayRange = g.days.length === 1
      ? dayLabels[g.days[0]]
      : `${dayLabels[g.days[0]]}-${dayLabels[g.days[g.days.length - 1]]}`
    const slots = [
      g.morning ? mLabel : "",
      g.evening ? eLabel : "",
    ].filter(Boolean).join(sep)
    return `${dayRange}: ${slots}`
  }).join(loc === "ar" ? " \u2022 " : " \u2022 ")
}

export function DoctorsSection() {
  const { t, locale } = useI18n()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getDoctors().then(setDoctors)
    getServices().then(setServices)
  }, [])

  // Set first tab with doctors as active
  useEffect(() => {
    if (services.length > 0 && doctors.length > 0 && !activeTab) {
      const first = services.find((s) => doctors.some((d) => d.serviceId === s.id))
      if (first) setActiveTab(first.id)
    }
  }, [services, doctors, activeTab])

  const filteredDoctors = doctors.filter((d) => d.serviceId === activeTab)
  const tabServices = services.filter((s) => doctors.some((d) => d.serviceId === s.id))

  const scroll = useCallback((dir: "left" | "right") => {
    if (!scrollRef.current) return
    const amount = 300
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }, [])

  const getDoctorName = (doc: Doctor) => locale === "ar" ? (doc.name_ar || doc.name_fr) : doc.name_fr
  const getDoctorTitle = (doc: Doctor) => locale === "ar" ? doc.title_ar : doc.title_fr
  const getInitials = (doc: Doctor) => {
    const name = doc.name_fr
    return name.split(" ").filter((_, i) => i > 0).map((n) => n[0]).join("").slice(0, 2)
  }

  return (
    <section id="doctors" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-clinic-accent mb-3">
            {locale === "ar" ? "\u0641\u0631\u064A\u0642\u0646\u0627 \u0627\u0644\u0637\u0628\u064A" : "Notre equipe"}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            {t("doctors_title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            {t("doctors_subtitle")}
          </p>
        </div>

        {/* Tabs by service */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {tabServices.map((svc) => {
            const isActive = svc.id === activeTab
            return (
              <button
                key={svc.id}
                onClick={() => setActiveTab(svc.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-clinic-primary text-primary-foreground shadow-md"
                    : "bg-clinic-soft text-muted-foreground hover:bg-clinic-mint hover:text-foreground"
                }`}
              >
                {locale === "ar" ? svc.name_ar : svc.name_fr}
              </button>
            )
          })}
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Arrow buttons (desktop) */}
          {filteredDoctors.length > 3 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex rounded-full bg-card shadow-lg border-border text-foreground hover:bg-clinic-soft"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex rounded-full bg-card shadow-lg border-border text-foreground hover:bg-clinic-soft"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {filteredDoctors.map((doctor) => (
              <Card
                key={doctor.id}
                className="flex-shrink-0 w-[260px] sm:w-[280px] snap-start group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-clinic-primary/30 overflow-hidden"
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  {/* Doctor photo or placeholder */}
                  <div className="relative w-28 h-28 rounded-full overflow-hidden bg-clinic-mint flex-shrink-0 group-hover:shadow-md transition-shadow ring-4 ring-clinic-soft">
                    {doctor.photoUrl ? (
                      <Image
                        src={doctor.photoUrl || "/placeholder.svg"}
                        alt={getDoctorName(doctor)}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="112px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-clinic-mint">
                        <span className="text-2xl font-bold text-clinic-accent">
                          {getInitials(doctor)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-semibold text-foreground text-base">
                      {getDoctorName(doctor)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {getDoctorTitle(doctor)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-clinic-soft text-clinic-deep text-xs">
                    {locale === "ar"
                      ? services.find((s) => s.id === doctor.serviceId)?.name_ar
                      : services.find((s) => s.id === doctor.serviceId)?.name_fr}
                  </Badge>
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground leading-snug">
                      <Clock className="h-3 w-3 inline ltr:mr-1 rtl:ml-1 align-text-bottom" />
                      {getScheduleSnippet(doctor, locale)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredDoctors.length === 0 && (
              <div className="w-full text-center py-12 text-muted-foreground">
                {t("admin_no_data")}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
