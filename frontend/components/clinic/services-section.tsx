"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "@/src/lib/i18n/context"
import { getServices } from "@/src/lib/api/services"
import type { Service } from "@/src/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"

export function ServicesSection() {
  const { t, locale } = useI18n()
  const [services, setServices] = useState<Service[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getServices().then(setServices)
  }, [])

  const computeActiveIndex = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-service-card='true']")
    )
    if (cards.length === 0) return

    const viewportCenter = container.getBoundingClientRect().left + container.clientWidth / 2
    let closestIndex = 0
    let closestDistance = Number.POSITIVE_INFINITY

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect()
      const cardCenter = rect.left + rect.width / 2
      const distance = Math.abs(viewportCenter - cardCenter)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })

    setActiveIndex(closestIndex)
  }, [services])

  useEffect(() => {
    computeActiveIndex()
    const container = scrollRef.current
    if (!container) return
    const onScroll = () => computeActiveIndex()
    container.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      container.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [computeActiveIndex])

  const hasMultiple = services.length > 1
  const cardStep = useMemo(() => {
    const container = scrollRef.current
    const firstCard = container?.querySelector<HTMLElement>("[data-service-card='true']")
    const gap = 20
    return (firstCard?.offsetWidth ?? 320) + gap
  }, [services.length])

  const scrollCarousel = (direction: "left" | "right") => {
    const container = scrollRef.current
    if (!container) return
    const delta = direction === "left" ? -cardStep : cardStep
    const signedDelta = locale === "ar" ? -delta : delta
    container.scrollBy({ left: signedDelta, behavior: "smooth" })
  }

  return (
    <section id="services" className="py-20 md:py-28 bg-clinic-soft">
      <div className="container mx-auto px-4">
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

        <div className="relative max-w-6xl mx-auto">
          {hasMultiple && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white text-foreground border-border shadow-md hover:bg-clinic-mint"
                onClick={() => scrollCarousel("left")}
                aria-label={locale === "ar" ? "السابق" : "Precedent"}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white text-foreground border-border shadow-md hover:bg-clinic-mint"
                onClick={() => scrollCarousel("right")}
                aria-label={locale === "ar" ? "التالي" : "Suivant"}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-2 sm:px-6 lg:px-20 pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {services.map((service, index) => {
              const isActive = index === activeIndex
              return (
                <Card
                  key={service.id}
                  data-service-card="true"
                  className={`group flex-shrink-0 w-[85%] sm:w-[62%] lg:w-[42%] xl:w-[36%] snap-center border transition-all duration-300 ${
                    isActive
                      ? "bg-white border-clinic-primary/40 shadow-xl"
                      : "bg-card/95 border-border/60 shadow-sm opacity-90"
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="h-1.5 w-full bg-gradient-to-r from-clinic-primary via-clinic-accent to-clinic-deep rounded-t-xl" />
                    <div className="p-6 md:p-7 flex flex-col items-center text-center gap-4 min-h-[250px]">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-clinic-deep transition-colors">
                        {locale === "ar" ? service.name_ar : service.name_fr}
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-prose">
                        {locale === "ar" ? service.description_ar : service.description_fr}
                      </p>
                      <a
                        href="#appointment"
                        className="inline-flex items-center text-sm font-semibold text-clinic-accent hover:text-clinic-deep transition-colors mt-1"
                      >
                        {locale === "ar" ? "\u0627\u062D\u062C\u0632 \u0645\u0648\u0639\u062F\u0627" : "Prendre rendez-vous"}
                        <ArrowRight className="h-4 w-4 ltr:ml-1.5 rtl:mr-1.5 rtl:rotate-180" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {services.length > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              {services.map((service, index) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    const container = scrollRef.current
                    const card = container?.querySelectorAll<HTMLElement>("[data-service-card='true']")[index]
                    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
                  }}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeIndex
                      ? "w-8 bg-clinic-primary"
                      : "w-2.5 bg-clinic-primary/30 hover:bg-clinic-primary/50"
                  }`}
                  aria-label={`${locale === "ar" ? "خدمة" : "Service"} ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
