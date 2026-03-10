"use client"

import type { DisplayState } from "@/src/lib/types"
import { BrandLogo } from "@/components/BrandLogo"

type CallInfoCardProps = {
  mode: DisplayState
  queueNumber?: number
  serviceLabel?: string
  doctorLabel?: string
  lang: "fr" | "ar"
  waitingTitle: string
  waitingSub: string
  offlineTitle: string
  callingTitle: string
  callingSub: string
}

const LABELS = {
  fr: {
    queue: "Numero",
    destination: "Destination",
    serviceFallback: "Service",
    doctorFallback: "Medecin",
  },
  ar: {
    queue: "الرقم",
    destination: "الوجهة",
    serviceFallback: "الخدمة",
    doctorFallback: "الطبيب",
  },
} as const

export function CallInfoCard({
  mode,
  serviceLabel,
  doctorLabel,
  lang,
  waitingTitle,
  waitingSub,
  offlineTitle,
  callingTitle,
  callingSub,
}: CallInfoCardProps) {
  const labels = LABELS[lang]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 md:p-8 lg:p-10 h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {mode}
        </span>
        <span className="h-2 w-2 rounded-full bg-clinic-primary" />
      </div>

      {mode === "CALLING" ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <BrandLogo size="md" variant="icon" />
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {callingTitle}
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            {callingSub}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {serviceLabel && (
              <p className="text-lg md:text-xl font-semibold text-foreground">
                {serviceLabel}
              </p>
            )}
            {doctorLabel && (
              <p className="text-base md:text-lg text-muted-foreground">
                {doctorLabel}
              </p>
            )}
          </div>
        </div>
      ) : mode === "OFF" ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <BrandLogo size="md" variant="icon" />
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {offlineTitle}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <BrandLogo size="md" variant="icon" />
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {waitingTitle}
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            {waitingSub}
          </p>
        </div>
      )}
    </div>
  )
}
