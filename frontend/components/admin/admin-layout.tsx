"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useI18n } from "@/src/lib/i18n/context"
import { getAdminSession, signOutAdmin } from "@/src/lib/api/auth"
import { LanguageSwitcher } from "@/components/clinic/language-switcher"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  LayoutDashboard,
  Stethoscope,
  UserCheck,
  CalendarDays,
  Monitor,
  Film,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { BrandLogo } from "@/components/BrandLogo"

const navItems = [
  { key: "admin_dashboard" as const, href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "admin_services" as const, href: "/admin/services", icon: Stethoscope },
  { key: "admin_doctors" as const, href: "/admin/doctors", icon: UserCheck },
  { key: "admin_appointments" as const, href: "/admin/appointments", icon: CalendarDays },
  { key: "admin_waiting_room" as const, href: "/admin/waiting-room", icon: Monitor },
  { key: "admin_media" as const, href: "/admin/media", icon: Film },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    getAdminSession()
      .then((session) => {
        if (!mounted) return
        if (!session?.user) {
          setReady(false)
          router.replace("/admin/login")
          return
        }
        setReady(true)
      })
      .catch(() => {
        if (!mounted) return
        setReady(false)
        router.replace("/admin/login")
      })

    return () => {
      mounted = false
    }
  }, [router])

  const handleLogout = async () => {
    await signOutAdmin()
    router.push("/admin/login")
  }

  if (!ready) return null

  return (
    <div className="min-h-screen flex bg-clinic-soft">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-card border-r border-border">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 rtl:flex-row-reverse">
            <BrandLogo size="sm" variant="icon" className="shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">Clinique</p>
              <p className="text-xs text-clinic-accent leading-tight">Mrabeut Admin</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-clinic-primary/10 text-clinic-deep"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(item.key)}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border flex flex-col gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
            {t("admin_logout")}
          </Button>
        </div>
      </aside>

      {/* Mobile Header + Sidebar */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <BrandLogo size="sm" variant="icon" className="shrink-0" />
            <span className="font-semibold text-foreground text-sm">Admin</span>
          </div>
          <LanguageSwitcher />
        </header>

        {sidebarOpen && (
          <div className="lg:hidden bg-card border-b border-border px-4 py-3">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-clinic-primary/10 text-clinic-deep"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.key)}
                  </Link>
                )
              })}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start gap-2 text-muted-foreground hover:text-destructive mt-2">
                <LogOut className="h-4 w-4" />
                {t("admin_logout")}
              </Button>
            </nav>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
