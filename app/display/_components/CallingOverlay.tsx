"use client"

import { BrandLogo } from "@/components/BrandLogo"
import { Stethoscope, UserRound } from "lucide-react"

type CallingOverlayProps = {
  visible: boolean
  queueNumber?: number
  patientName?: string | null
  serviceName?: string | null
  doctorTitle?: string | null
}

export function CallingOverlay({
  visible,
  queueNumber,
  patientName,
  serviceName,
  doctorTitle,
}: CallingOverlayProps) {
  const hasQueueNumber = queueNumber !== undefined && queueNumber !== null

  return (
    <div
      className={`absolute inset-x-6 bottom-6 md:inset-x-10 md:bottom-10 z-10 transition-all duration-300 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="relative max-w-3xl mx-auto bg-white/90 backdrop-blur-md rounded-2xl p-5 md:p-8 shadow-xl border border-clinic-primary/30 text-left rtl:text-right">
        <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-clinic-accent via-clinic-primary to-clinic-deep" />

        <div className="flex items-start justify-between gap-3 mb-4 md:mb-5">
          <p className="inline-flex items-center rounded-full bg-clinic-soft px-3 py-1 text-xs md:text-sm font-semibold tracking-wide text-clinic-deep">
            En cours d'appel / جارِ النداء
          </p>
          <div className="opacity-80">
            <BrandLogo size="sm" variant="icon" />
          </div>
        </div>

        <div
          className={`grid gap-4 ${
            hasQueueNumber ? "grid-cols-1 md:grid-cols-[1.1fr_1fr]" : "grid-cols-1"
          }`}
        >
          {hasQueueNumber && (
            <div className="rounded-xl bg-white/25 p-4 md:p-5 border border-white/40">
              <div className="mt-2 text-6xl md:text-7xl 2xl:text-8xl font-extrabold text-clinic-deep leading-none">
                {queueNumber}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/40 bg-white/20 p-4 md:p-5">
            <p className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
              <UserRound className="h-4 w-4 text-clinic-accent" />
              Patient / المريض
            </p>
            <p className="mt-2 text-2xl md:text-3xl font-bold text-foreground break-words">
              {patientName || "--"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/40 bg-white/20 p-4 md:p-5">
          <p className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
            <Stethoscope className="h-4 w-4 text-clinic-accent" />
            Destination / الوجهة
          </p>
          <p className="mt-2 text-xl md:text-2xl font-semibold text-foreground">
            {serviceName ?? "Service"}
          </p>
          {doctorTitle && (
            <p className="mt-1 text-base md:text-lg text-muted-foreground">
              {doctorTitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
