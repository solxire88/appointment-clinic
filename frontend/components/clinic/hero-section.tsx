"use client"

import { useI18n } from "@/src/lib/i18n/context"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar } from "lucide-react"
import Image from "next/image"

export function HeroSection() {
    const { t } = useI18n()

    return (
        <section className="relative w-full min-h-[60vh] lg:min-h-[75vh] overflow-hidden">
            {/* Full-bleed background image */}
            <div className="absolute inset-0">
                <Image
                    src="/images/hero-clinic.png"
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority
                />
                {/* Gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
            </div>

            {/* Content in centered container */}
            <div className="relative container mx-auto px-4 py-20 md:py-28 lg:py-36 flex items-center min-h-[60vh] lg:min-h-[75vh]">
                <div className="max-w-xl flex flex-col gap-6">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-background leading-tight text-balance">
                        {t("hero_title")}
                    </h1>
                    <p className="text-lg text-background/80 max-w-lg leading-relaxed">
                        {t("hero_subtitle")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button asChild size="lg" className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
                            <a href="#appointment">
                                <Calendar className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
                                {t("hero_cta")}
                            </a>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="border-background/40 text-background hover:bg-background/10 bg-transparent">
                            <a href="#about">
                                {t("hero_learn_more")}
                                <ArrowRight className="h-4 w-4 ltr:ml-2 rtl:mr-2 rtl:rotate-180" />
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
