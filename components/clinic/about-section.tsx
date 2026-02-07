"use client"

import { useI18n } from "@/src/lib/i18n/context"
import Image from "next/image"

export function AboutSection() {
    const { t } = useI18n()

    return (
        <section id="about" className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
                    {/* Image */}
                    <div className="flex-1 w-full">
                        <div className="relative w-full rounded-2xl overflow-hidden shadow-xl group">
                            <Image
                                src="/images/about-clinic.jpeg"
                                alt="Equipe de la Clinique Mrabeut"
                                width={800}
                                height={600}
                                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>
                    </div>

                    {/* Content -- clean text block, no statistics */}
                    <div className="flex-1 flex flex-col gap-6">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-clinic-accent mb-3">
                                {"A propos"}
                            </p>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 text-balance">
                                {t("about_title")}
                            </h2>
                            <p className="text-lg text-clinic-accent font-medium">
                                {t("about_subtitle")}
                            </p>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-base">
                            {t("about_text_1")}
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-base">
                            {t("about_text_2")}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
