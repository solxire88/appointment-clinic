"use client"

import { useI18n } from "@/src/lib/i18n/context"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Mail, Clock } from "lucide-react"

export function ContactSection() {
    const { t } = useI18n()

    const contactInfo = [
        { icon: MapPin, label: t("contact_address"), value: t("contact_address_value") },
        { icon: Phone, label: t("contact_phone"), value: t("topbar_phone") },
        { icon: Mail, label: t("contact_email"), value: t("topbar_email") },
        { icon: Clock, label: t("contact_hours"), value: t("contact_hours_value") },
    ]

    return (
        <section id="contact" className="py-16 md:py-24 bg-clinic-soft">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
                        {t("contact_title")}
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        {t("contact_subtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Contact Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {contactInfo.map((item) => {
                            const Icon = item.icon
                            return (
                                <Card key={item.label} className="border-transparent">
                                    <CardContent className="p-5 flex items-start gap-4">
                                        <div className="flex-shrink-0 rounded-lg bg-clinic-mint p-2.5">
                                            <Icon className="h-5 w-5 text-clinic-deep" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{item.value}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Map Placeholder */}
                    <Card className="overflow-hidden border-transparent">
                        <CardContent className="p-0">
                            <div className="w-full h-full min-h-[300px] bg-muted flex items-center justify-center relative">
                                <iframe
                                    title="Clinic Location"
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3260.7173609141773!2d-0.6440229252330116!3d35.18859645688021!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd7f01b50180165d%3A0x51666fc05d6fb876!2sDr.%20Merabet%20ORL%20et%20cardiologie!5e0!3m2!1sen!2sdz!4v1770423065022!5m2!1sen!2sdz"
                                    className="w-full h-full min-h-[300px] border-0"
                                    loading="lazy"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}
