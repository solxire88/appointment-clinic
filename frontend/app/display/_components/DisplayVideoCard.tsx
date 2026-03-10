"use client"

import { useState } from "react"

type OverlayData = {
  visible: boolean
  queueNumber?: number
  serviceLabel?: string
  doctorLabel?: string
  lang: "fr" | "ar"
  callingLabel: string
}

type DisplayVideoCardProps = {
  src: string
  title?: string
  fallbackText?: string
  overlay?: OverlayData
}

export function DisplayVideoCard({
  src,
  title = "Video",
  fallbackText = "Video indisponible / الفيديو غير متاح",
  overlay,
}: DisplayVideoCardProps) {
  const [failed, setFailed] = useState(false)
  const isCalling = overlay?.visible
  const isRtl = overlay?.lang === "ar"

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        <span className="text-xs text-muted-foreground">MP4 / WebM</span>
      </div>
      <div className="relative aspect-video w-full rounded-2xl border border-black/10 bg-black/90 overflow-hidden flex items-center justify-center">
        {!failed ? (
          <video
            src={src}
            className="w-full h-full object-contain"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="text-sm md:text-base text-white/80 text-center px-6">
            {fallbackText}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
        {overlay && (
          <div
            className={`absolute inset-x-6 bottom-6 md:inset-x-10 md:bottom-10 z-10 transition-all duration-300 ease-out ${
              isCalling ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <div
              className={`max-w-3xl mx-auto bg-white/85 backdrop-blur-md rounded-2xl p-6 md:p-10 shadow-xl border border-clinic-primary/30 ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              <div className="h-1.5 w-14 rounded-full bg-clinic-accent mb-4" />
              <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {overlay.callingLabel}
              </p>
              <div className="mt-2 text-7xl md:text-8xl 2xl:text-9xl font-extrabold text-clinic-deep leading-none">
                {overlay.queueNumber ?? "--"}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {overlay.serviceLabel && (
                  <p className="text-2xl md:text-3xl font-bold text-foreground">
                    {overlay.serviceLabel}
                  </p>
                )}
                {overlay.doctorLabel && (
                  <p className="text-lg md:text-xl text-muted-foreground">
                    {overlay.doctorLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
