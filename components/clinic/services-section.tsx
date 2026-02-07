"use client"

import { useEffect, useState, useRef } from "react"
import { useI18n } from "@/src/lib/i18n/context"
import { getServices } from "@/src/lib/api/services"
import type { Service } from "@/src/lib/types"

export function ServicesSection() {
  const { t, locale } = useI18n()
  const [services, setServices] = useState<Service[]>([])
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getServices().then(setServices)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-service-id")
            if (id) setVisibleIds((prev) => new Set(prev).add(id))
          }
        }
      },
      { threshold: 0.15 }
    )
    const cards = sectionRef.current?.querySelectorAll("[data-service-id]")
    cards?.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [services])

  return (
    <section id="services" className="py-20 md:py-28 bg-clinic-soft">
      <div className="container mx-auto px-4" ref={sectionRef}>
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-clinic-accent mb-3">
            {locale === "ar" ? "\u062E\u062F\u0645\u0627\u062A\u0646\u0627 \u0627\u0644\u0637\u0628\u064A\u0629" : "Nos specialites"}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            {t("services_title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            {t("services_subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, index) => (
            <div
              key={service.id}
              data-service-id={service.id}
              className={`group relative bg-card rounded-xl border border-border/50
                hover:border-clinic-primary/40 hover:shadow-lg
                transition-all duration-500 ease-out
                ${visibleIds.has(service.id) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              {/* Left accent border */}
              <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 w-1 rounded-l-xl rtl:rounded-l-none rtl:rounded-r-xl bg-clinic-primary/60 group-hover:bg-clinic-primary transition-colors" />

              <div className="p-6 ltr:pl-7 rtl:pr-7 flex flex-col gap-3">
                <h3 className="text-lg font-bold text-foreground group-hover:text-clinic-deep transition-colors">
                  {locale === "ar" ? service.name_ar : service.name_fr}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {locale === "ar" ? service.description_ar : service.description_fr}
                </p>
                <a
                  href="#appointment"
                  className="inline-flex items-center text-sm font-medium text-clinic-accent hover:text-clinic-deep transition-colors mt-1"
                >
                  {locale === "ar" ? "\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644" : "Voir details"}
                  <svg
                    className="h-4 w-4 ltr:ml-1 rtl:mr-1 rtl:rotate-180 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
