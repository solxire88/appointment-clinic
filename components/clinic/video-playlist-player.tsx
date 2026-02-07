"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import type { ClinicVideo } from "@/src/lib/types"

interface VideoPlaylistPlayerProps {
  videos: ClinicVideo[]
  /** Extra classes on the root container (positioned absolute by default) */
  className?: string
  /** Whether to dim/blur the video (e.g. during CALLING state) */
  dimmed?: boolean
  /** If true, pauses playback */
  paused?: boolean
}

export function VideoPlaylistPlayer({
  videos,
  className = "",
  dimmed = false,
  paused = false,
}: VideoPlaylistPlayerProps) {
  const enabledVideos = videos.filter((v) => v.enabled).sort((a, b) => a.order - b.order)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const videoRef = useRef<HTMLVideoElement>(null)
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset index when playlist changes
  useEffect(() => {
    setCurrentIndex(0)
  }, [enabledVideos.length])

  // Handle pause/play
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (paused) {
      el.pause()
    } else {
      el.play().catch(() => {/* autoplay blocked */})
    }
  }, [paused])

  const handleEnded = useCallback(() => {
    if (enabledVideos.length <= 1) {
      // Single video -- just loop
      const el = videoRef.current
      if (el) {
        el.currentTime = 0
        el.play().catch(() => {})
      }
      return
    }
    // Fade out, switch, fade in
    setOpacity(0)
    transitionTimeout.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % enabledVideos.length)
      setOpacity(1)
    }, 400)
  }, [enabledVideos.length])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current)
    }
  }, [])

  // Auto-play when source changes
  useEffect(() => {
    const el = videoRef.current
    if (!el || enabledVideos.length === 0) return
    el.load()
    if (!paused) el.play().catch(() => {})
  }, [currentIndex, enabledVideos, paused])

  if (enabledVideos.length === 0) {
    // Fallback: static background
    return (
      <div className={`absolute inset-0 bg-foreground ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-clinic.jpg"
          alt=""
          className="w-full h-full object-cover opacity-30"
        />
      </div>
    )
  }

  const currentVideo = enabledVideos[currentIndex % enabledVideos.length]

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        transition: "filter 0.5s ease",
        filter: dimmed ? "blur(8px) brightness(0.4)" : "none",
      }}
    >
      <video
        ref={videoRef}
        key={currentVideo?.id}
        className="w-full h-full object-cover"
        style={{
          opacity,
          transition: "opacity 0.4s ease",
        }}
        src={currentVideo?.src}
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        poster="/images/hero-clinic.jpg"
      />
    </div>
  )
}
