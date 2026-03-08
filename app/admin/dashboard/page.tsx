"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useI18n } from "@/src/lib/i18n/context"
import { getDashboardStats } from "@/src/lib/api/stats"
import { getServices } from "@/src/lib/api/services"
import { getDoctors } from "@/src/lib/api/doctors"
import { getClinicDateString } from "@/src/lib/utils/clinic-date"
import type { DashboardStats, Service, Doctor } from "@/src/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CalendarDays, Sun, Moon, Clock, CheckCircle, AlertCircle, UserX, Stethoscope, UserCheck } from "lucide-react"

export default function DashboardPage() {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [filterDate, setFilterDate] = useState(getClinicDateString())
  const [filterService, setFilterService] = useState("all")

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]))
  const doctorMap = Object.fromEntries(doctors.map((d) => [d.id, d]))

  useEffect(() => {
    getServices("admin").then(setServices)
    getDoctors("admin").then(setDoctors)
  }, [])

  useEffect(() => {
    getDashboardStats(filterDate).then(setStats)
  }, [filterDate])

  const getDocName = (id: string) => {
    const d = doctorMap[id]
    if (!d) return id
    return locale === "ar" ? d.name_ar : d.name_fr
  }

  const getSvcName = (id: string) => {
    const s = serviceMap[id]
    if (!s) return id
    return locale === "ar" ? s.name_ar : s.name_fr
  }

  const perDoctorFiltered = stats?.perDoctor.filter((pd) => {
    if (filterService === "all") return true
    const doc = doctorMap[pd.doctorId]
    return doc?.serviceId === filterService
  }) || []

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">{t("admin_dashboard")}</h1>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-auto"
            />
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("admin_all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin_all")}</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {locale === "ar" ? s.name_ar : s.name_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Top row: totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-clinic-mint p-3">
                <CalendarDays className="h-6 w-6 text-clinic-deep" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("admin_today")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalToday ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-yellow-50 p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("status_waiting")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.byStatus.WAITING ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-blue-50 p-3">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("status_called")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.byStatus.CALLED ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-clinic-mint p-3">
                <CheckCircle className="h-6 w-6 text-clinic-deep" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("status_done")}</p>
                <p className="text-3xl font-bold text-foreground">{stats?.byStatus.DONE ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second row: slot split + top services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By slot */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                {t("admin_by_slot")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 rounded-xl bg-clinic-soft p-5 text-center">
                  <Sun className="h-6 w-6 text-clinic-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">{stats?.morning ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("appointment_morning")}</p>
                </div>
                <div className="flex-1 rounded-xl bg-clinic-soft p-5 text-center">
                  <Moon className="h-6 w-6 text-clinic-accent mx-auto mb-2" />
                  <p className="text-3xl font-bold text-foreground">{stats?.evening ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("appointment_evening")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top services */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-clinic-accent" />
                {t("admin_by_service")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.topServices.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {stats.topServices.map((ts) => (
                    <div key={ts.serviceId} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{getSvcName(ts.serviceId)}</span>
                      <Badge variant="secondary" className="bg-clinic-soft text-clinic-deep">{ts.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("admin_no_data")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per doctor today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-foreground">
              {locale === "ar" ? "\u062D\u0627\u0644\u0629 \u0643\u0644 \u0637\u0628\u064A\u0628 \u0627\u0644\u064A\u0648\u0645" : "Par medecin aujourd'hui"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "ar" ? "\u0627\u0644\u0637\u0628\u064A\u0628" : "Medecin"}</TableHead>
                  <TableHead className="text-center">{t("status_waiting")}</TableHead>
                  <TableHead className="text-center">{t("status_called")}</TableHead>
                  <TableHead className="text-center">{t("status_done")}</TableHead>
                  <TableHead>{locale === "ar" ? "\u0627\u0644\u062A\u0627\u0644\u064A" : "Prochain"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perDoctorFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t("admin_no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  perDoctorFiltered.map((pd) => (
                    <TableRow key={pd.doctorId}>
                      <TableCell className="font-medium text-foreground">{getDocName(pd.doctorId)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-yellow-100 text-yellow-800">{pd.waiting}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-100 text-blue-800">{pd.called}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-clinic-mint text-clinic-deep">{pd.done}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pd.nextWaiting
                          ? pd.nextWaiting.patientName
                          : "-"
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
