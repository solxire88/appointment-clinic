"use client"

import { useState } from "react"
import { useI18n } from "@/src/lib/i18n/context"
import { LanguageSwitcher } from "./language-switcher"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { BrandLogo } from "@/components/BrandLogo"

export function Header() {
    const { t } = useI18n()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navItems = [
        { label: t("nav_services"), href: "#services" },
        { label: t("nav_doctors"), href: "#doctors" },
        { label: t("nav_appointment"), href: "#appointment" },
        { label: t("nav_contact"), href: "#contact" },
    ]

    return (
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
            <div className="container mx-auto flex items-center justify-between px-4 py-3">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 rtl:flex-row-reverse">
                    <BrandLogo size="lg" variant="default" className="shrink-0" priority />
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {navItems.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    <LanguageSwitcher />
                    <Button asChild className="hidden md:inline-flex bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
                        <a href="#appointment">{t("hero_cta")}</a>
                    </Button>

                    {/* Mobile toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-border bg-card">
                    <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
                        {navItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.label}
                            </a>
                        ))}
                        <Button asChild className="mt-2 bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
                            <a href="#appointment" onClick={() => setMobileMenuOpen(false)}>
                                {t("hero_cta")}
                            </a>
                        </Button>
                    </nav>
                </div>
            )}
        </header>
    )
}
