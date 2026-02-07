"use client"

import { BrandLogo } from "@/components/BrandLogo"
import type { ReactNode } from "react"

type DisplayShellProps = {
  mode: "IDLE" | "CALLING" | "OFF"
  timeString: string
  dateString: string
  children: ReactNode
}

const statusStyles: Record<DisplayShellProps["mode"], string> = {
  IDLE: "bg-clinic-mint text-clinic-deep",
  CALLING: "bg-clinic-primary text-primary-foreground",
  OFF: "bg-muted text-muted-foreground",
}

export function DisplayShell({ mode, timeString, dateString, children }: DisplayShellProps) {
  return (
    <div className="min-h-screen bg-[#F1F9F6] text-foreground">
      <div className="min-h-screen px-6 py-6 lg:px-10 lg:py-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 rtl:flex-row-reverse">
              <div className="h-12 flex items-center">
                <BrandLogo size="md" variant="icon" priority />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Clinique Mrabeut</p>
                <p className="text-sm text-muted-foreground">Salle d'attente</p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <div className="text-sm text-muted-foreground">{dateString}</div>
              <div className="text-2xl font-bold text-foreground">{timeString}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[mode]}`}>
                {mode}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
