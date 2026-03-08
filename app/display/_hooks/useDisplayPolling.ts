"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type DisplayMode = "IDLE" | "CALLING" | "OFF"

export type DisplayDestination = {
  serviceName: string
  doctorTitle?: string | null
}

export type DisplayPayload = {
  mode: DisplayMode
  queueNumber?: number | null
  patientName?: string | null
  destination?: DisplayDestination | null
  updatedAt: string
}

type ApiDisplayChanged = {
  changed: boolean
  updatedAt: string
  mode?: DisplayMode
  shownQueueNumber?: number | null
  appointment?: { id: string; patientName: string } | null
  doctor?: { id: string; nameFr: string; nameAr: string } | null
  service?: { id: string; nameFr: string; nameAr: string } | null
}

const POLL_INTERVALS: Record<DisplayMode, number> = {
  IDLE: 10000,
  CALLING: 3000,
  OFF: 10000,
}

export function useDisplayPolling() {
  const [data, setData] = useState<DisplayPayload | null>(null)
  const lastUpdatedRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibleRef = useRef(true)

  const poll = useCallback(async () => {
    if (!visibleRef.current) return
    const headers: HeadersInit = {}
    if (lastUpdatedRef.current) {
      headers["If-Modified-Since"] = lastUpdatedRef.current
    }

    const response = await fetch("/api/display", { headers })
    if (response.status === 304) {
      return
    }
    if (!response.ok) {
      return
    }
    const raw = (await response.json()) as DisplayPayload | ApiDisplayChanged

    if ("changed" in raw) {
      if (!raw.changed) {
        if (raw.updatedAt) {
          lastUpdatedRef.current = raw.updatedAt
        }
        return
      }
      const mapped: DisplayPayload = {
        mode: raw.mode ?? "IDLE",
        queueNumber: raw.shownQueueNumber ?? null,
        patientName: raw.appointment?.patientName ?? null,
        destination: raw.service || raw.doctor
          ? {
              serviceName: raw.service?.nameFr ?? raw.service?.nameAr ?? "Service",
              doctorTitle: raw.doctor?.nameFr ?? raw.doctor?.nameAr ?? null,
            }
          : null,
        updatedAt: raw.updatedAt,
      }

      if (lastUpdatedRef.current && mapped.updatedAt === lastUpdatedRef.current) {
        return
      }
      lastUpdatedRef.current = mapped.updatedAt
      setData(mapped)
      return
    }

    if (!raw.updatedAt) return
    if (lastUpdatedRef.current && raw.updatedAt === lastUpdatedRef.current) {
      return
    }
    lastUpdatedRef.current = raw.updatedAt
    setData(raw)
  }, [data?.mode])

  useEffect(() => {
    poll()
  }, [poll])

  useEffect(() => {
    const interval = POLL_INTERVALS[data?.mode ?? "IDLE"]
    if (interval === 0) return

    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        await poll()
        schedule()
      }, interval)
    }

    schedule()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [data?.mode, poll])

  useEffect(() => {
    const handleVisibility = () => {
      visibleRef.current = document.visibilityState === "visible"
      if (visibleRef.current) {
        poll()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [poll])

  return { data }
}
