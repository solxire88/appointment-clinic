"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

type VideoPlayerProps = {
  sources?: string[]
  children?: ReactNode
}

export function VideoPlayer({ sources = [], children }: VideoPlayerProps) {
  const [failed, setFailed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const hasSources = sources.length > 0
  const currentSrc = hasSources ? sources[currentIndex % sources.length] : undefined
  const canPlay = Boolean(currentSrc) && !failed

  useEffect(() => {
    setCurrentIndex(0)
    setFailed(false)
  }, [sources.join("|")])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !canPlay) return
    el.play().catch(() => {
      // Autoplay blocked; keep fallback to user gesture-free playback.
    })
  }, [canPlay, currentSrc])

  const handleEnded = () => {
    if (sources.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % sources.length)
  }

  const handleError = () => {
    if (sources.length <= 1) {
      setFailed(true)
      return
    }
    setFailed(false)
    setCurrentIndex((prev) => (prev + 1) % sources.length)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 md:p-6 lg:p-8">
      <div className="relative aspect-video w-full rounded-2xl border border-black/10 bg-black/90 overflow-hidden flex items-center justify-center">
        {canPlay ? (
          <video
            key={currentIndex}
            ref={videoRef}
            src={currentSrc}
            className="w-full h-full object-contain"
            autoPlay
            muted
            loop={sources.length <= 1}
            playsInline
            controls={false}
            onEnded={handleEnded}
            onError={handleError}
          />
        ) : (
          <div className="text-sm md:text-base text-white/80 text-center px-6">
            Aucune video disponible / لا يوجد فيديو
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
        {children}
      </div>
    </div>
  )
}
