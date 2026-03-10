"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
    size?: "sm" | "md" | "lg"
    variant?: "default" | "icon"
    className?: string
    priority?: boolean
}

const DEFAULT_ALT = "Clinique Mrabeut"

const SIZE_CLASS: Record<
    NonNullable<BrandLogoProps["size"]>,
    { h: string; wText: string; wIcon: string }
> = {
    sm: { h: "h-8", wText: "w-28", wIcon: "w-8" },
    md: { h: "h-12", wText: "w-40", wIcon: "w-12" },
    lg: { h: "h-20", wText: "w-64", wIcon: "w-20" },
}

const enc = (path: string) => encodeURI(path)

const CANDIDATES: Record<NonNullable<BrandLogoProps["variant"]>, string[]> = {
    default: [
        enc("/assets/Full-Logo.png"),
    ],
    icon: [
        enc("/assets/green-logo-small.png"),
        enc("/assets/logo vert-1/244f7eea-1.png"),
    ],
}

const resolvedCache: Partial<Record<NonNullable<BrandLogoProps["variant"]>, string>> = {}

const isPdf = (path: string) => path.toLowerCase().endsWith(".pdf")

export function BrandLogo({
    size = "md",
    variant = "default",
    className,
    priority = false,
}: BrandLogoProps) {
    const sizeClasses = SIZE_CLASS[size]
    const widthClass = variant === "icon" ? sizeClasses.wIcon : sizeClasses.wText

    const fallbackSrc = useMemo(() => {
        const list = CANDIDATES[variant]
        return list[list.length - 1]
    }, [variant])

    const [resolvedSrc, setResolvedSrc] = useState<string | null>(
        resolvedCache[variant] ?? null
    )

    useEffect(() => {
        let cancelled = false
        if (resolvedCache[variant]) {
            setResolvedSrc(resolvedCache[variant] ?? null)
            return
        }

        const pickFirstAvailable = async () => {
            const list = CANDIDATES[variant]
            for (const candidate of list) {
                try {
                    const response = await fetch(candidate, { method: "HEAD" })
                    if (response.ok) {
                        resolvedCache[variant] = candidate
                        if (!cancelled) setResolvedSrc(candidate)
                        return
                    }
                } catch {
                    // ignore and try next
                }
            }
            resolvedCache[variant] = fallbackSrc
            if (!cancelled) setResolvedSrc(fallbackSrc)
        }

        pickFirstAvailable()
        return () => {
            cancelled = true
        }
    }, [fallbackSrc, variant])

    const src = resolvedSrc ?? fallbackSrc
    const wrapperClass = cn("relative overflow-hidden", sizeClasses.h, widthClass, className)

    if (isPdf(src)) {
        return (
            <div className={wrapperClass} aria-label={DEFAULT_ALT}>
                <object data={src} type="application/pdf" className="w-full h-full">
                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground">
                        {DEFAULT_ALT}
                    </div>
                </object>
            </div>
        )
    }

    return (
        <div className={wrapperClass}>
            <Image
                src={src}
                alt={DEFAULT_ALT}
                fill
                sizes="100vw"
                className="object-contain"
                priority={priority}
            />
        </div>
    )
}
