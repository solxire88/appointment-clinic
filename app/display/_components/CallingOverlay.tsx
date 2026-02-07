"use client"

import { BrandLogo } from "@/components/BrandLogo"

type CallingOverlayProps = {
  visible: boolean
  queueNumber?: number
  serviceName?: string | null
  doctorTitle?: string | null
}

export function CallingOverlay({
  visible,
  queueNumber,
  serviceName,
  doctorTitle,
}: CallingOverlayProps) {
  return (
    <div
      className={`absolute inset-x-6 bottom-6 md:inset-x-10 md:bottom-10 z-10 transition-all duration-300 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="relative max-w-3xl mx-auto bg-white/85 backdrop-blur-md rounded-2xl p-6 md:p-10 shadow-xl border border-clinic-primary/30 text-left rtl:text-right">
        <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 opacity-70">
          <BrandLogo size="sm" variant="icon" />
        </div>
        <div className="h-1.5 w-14 rounded-full bg-clinic-accent mb-4" />
        <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          En cours d'appel / جارِ النداء
        </p>
        <div className="mt-2 text-7xl md:text-8xl 2xl:text-9xl font-extrabold text-clinic-deep leading-none">
          {queueNumber ?? "--"}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {serviceName ?? "Service"}
          </p>
          {doctorTitle && (
            <p className="text-lg md:text-xl text-muted-foreground">
              {doctorTitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
