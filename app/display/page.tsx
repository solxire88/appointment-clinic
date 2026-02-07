"use client"

import { useEffect, useState } from "react"
import { DisplayShell } from "@/app/display/_components/DisplayShell"
import { VideoPlayer } from "@/app/display/_components/VideoPlayer"
import { CallingOverlay } from "@/app/display/_components/CallingOverlay"
import { useDisplayPolling } from "@/app/display/_hooks/useDisplayPolling"
import { BrandLogo } from "@/components/BrandLogo"

export default function DisplayPage() {
    const { data } = useDisplayPolling()

    const mode = data?.mode ?? "IDLE"
    const queueNumber = data?.queueNumber ?? null
    const destination = data?.destination ?? null

    const [timeString, setTimeString] = useState("")
    const [dateString, setDateString] = useState("")

    useEffect(() => {
        const tick = () => {
            const now = new Date()
            setTimeString(
                now.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })
            )
            setDateString(
                now.toLocaleDateString("fr-DZ", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })
            )
        }
        tick()
        const iv = setInterval(tick, 10000)
        return () => clearInterval(iv)
    }, [])

  const [videoSources, setVideoSources] = useState<string[]>([])

    useEffect(() => {
        let cancelled = false
        const loadVideos = async () => {
            try {
                const response = await fetch("/api/videos")
                if (!response.ok) return
        const payload = (await response.json()) as { videos?: Array<{ url: string; sortOrder: number }> }
        const videos = payload.videos ?? []
        const ordered = [...videos].sort((a, b) => a.sortOrder - b.sortOrder)
        const urls = ordered.map((video) => video.url).filter(Boolean)
        if (!cancelled) {
          setVideoSources(urls)
        }
      } catch {
        // ignore
      }
    }
        loadVideos()
        const iv = setInterval(loadVideos, 30000)
        return () => {
            cancelled = true
            clearInterval(iv)
        }
    }, [])

    return (
        <DisplayShell mode={mode} timeString={timeString} dateString={dateString}>
            {mode === "OFF" ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white shadow-sm border border-black/5 p-10 min-h-[360px] text-center">
                    <BrandLogo size="lg" variant="default" className="mb-6" priority />
                    <div className="text-2xl md:text-3xl font-semibold text-foreground">
                        Ecran hors service
                    </div>
                    <div className="text-base text-muted-foreground mt-2">
                        / الشاشة غير متاحة
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {mode === "IDLE" && (
                        <div className="flex justify-center">
                        </div>
                    )}
          <VideoPlayer sources={videoSources}>
            <CallingOverlay
              visible={mode === "CALLING"}
              queueNumber={queueNumber ?? undefined}
              serviceName={destination?.serviceName}
              doctorTitle={destination?.doctorTitle}
            />
          </VideoPlayer>
                </div>
            )}
        </DisplayShell>
    )
}
