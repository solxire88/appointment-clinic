"use client"

import { useEffect, useState, useCallback } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useI18n } from "@/src/lib/i18n/context"
import { getAppointments, callNextForDoctor, callSpecificForDoctor, updateAppointmentStatus } from "@/src/lib/api/appointments"
import { getServices } from "@/src/lib/api/services"
import { getDoctors } from "@/src/lib/api/doctors"
import { getDisplayState, setDisplayState } from "@/src/lib/api/display"
import { getClinicDateString } from "@/src/lib/utils/clinic-date"
import type { Appointment, Service, Doctor, DisplayData, AppointmentSlot } from "@/src/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Monitor, Phone, Volume2, Search, CheckCircle, UserCheck } from "lucide-react"
import Image from "next/image"

export default function AdminWaitingRoomPage() {
  const { t, locale } = useI18n()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [display, setDisplay] = useState<DisplayData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectDoctorId, setSelectDoctorId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(getClinicDateString())
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot>("morning")

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]))
  const doctorMap = Object.fromEntries(doctors.map((d) => [d.id, d]))
  const getArrivalSortValue = (appointment: Appointment) => {
    const candidates = [appointment.arrivedAt, appointment.createdAt]
    for (const value of candidates) {
      if (value) {
        const timestamp = new Date(value).getTime()
        if (Number.isFinite(timestamp)) return timestamp
      }
    }
    return Number.MAX_SAFE_INTEGER
  }
  const sortByArrival = (a: Appointment, b: Appointment) =>
    getArrivalSortValue(a) - getArrivalSortValue(b)

  const loadData = useCallback(async () => {
    const [appts, svcs, docs, displayResult] = await Promise.all([
      getAppointments({ date: selectedDate, slot: selectedSlot }),
      getServices("admin"),
      getDoctors("admin"),
      getDisplayState(),
    ])
    setAppointments(appts)
    setServices(svcs)
    setDoctors(docs)
    setDisplay(displayResult.data)
  }, [selectedDate, selectedSlot])

  useEffect(() => { loadData() }, [loadData])

  const getDocName = (doc: Doctor) => locale === "ar" ? doc.name_ar : doc.name_fr
  const getInitials = (doc: Doctor) => doc.name_fr.split(" ").filter((_, i) => i > 0).map((n) => n[0]).join("").slice(0, 2)

  // Per-doctor summary
  const doctorSummaries = doctors.map((doc) => {
    const docAppts = appointments.filter((a) => a.doctorId === doc.id)
    const waiting = docAppts
      .filter((a) => a.status === "WAITING")
      .sort(sortByArrival)
    const called = docAppts.filter((a) => a.status === "CALLED")
    const done = docAppts.filter((a) => a.status === "DONE")
    const total = waiting.length + called.length + done.length
    return { doctor: doc, waiting, called, done, total }
  }).filter((d) => d.total > 0)

  const filteredSummaries = searchQuery
    ? doctorSummaries.filter((s) =>
        s.doctor.name_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.doctor.name_ar.includes(searchQuery)
      )
    : doctorSummaries

  const handleCallNextForDoctor = async (doctorId: string) => {
    setLoading(true)
    try {
      await callNextForDoctor({ doctorId, date: selectedDate, slot: selectedSlot })
      await loadData()
    } finally {
      setLoading(false)
    }
  }

  const handleCallSpecific = async (appointmentId: string) => {
    setLoading(true)
    try {
      await callSpecificForDoctor(appointmentId)
      await loadData()
      setSelectDoctorId(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFinishCall = async (id: string) => {
    setLoading(true)
    try {
      await updateAppointmentStatus(id, "DONE")
      await setDisplayState("IDLE")
      await loadData()
    } finally {
      setLoading(false)
    }
  }


  // Currently called appointments across all doctors
  const currentlyCalled = appointments.filter((a) => a.status === "CALLED")

  // Waiting appointments for the select modal
  const selectDoctorWaiting = selectDoctorId
    ? appointments
        .filter((a) => a.doctorId === selectDoctorId && a.status === "WAITING")
        .sort(sortByArrival)
    : []

  const displayBadge = {
    IDLE: { label: "IDLE", className: "bg-clinic-mint text-clinic-deep" },
    CALLING: { label: "CALLING", className: "bg-clinic-primary text-primary-foreground" },
    OFF: { label: "OFF", className: "bg-muted text-muted-foreground" },
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-foreground">{t("admin_waiting_room")}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("admin_filter_date")}</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("appointment_slot")}</label>
            <Select value={selectedSlot} onValueChange={(v) => setSelectedSlot(v as AppointmentSlot)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">{t("appointment_morning")}</SelectItem>
                <SelectItem value="evening">{t("appointment_evening")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Currently called section */}
        {currentlyCalled.length > 0 && (
          <Card className="border-clinic-primary/30 bg-clinic-soft/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-clinic-accent" />
                {locale === "ar" ? "\u0627\u0644\u0645\u0646\u0627\u062F\u0649 \u062D\u0627\u0644\u064A\u0627\u064B" : "Actuellement appeles"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {currentlyCalled.map((apt) => {
                  const doc = doctorMap[apt.doctorId]
                  const svc = serviceMap[apt.serviceId]
                  return (
                    <div key={apt.id} className="flex items-center justify-between bg-card rounded-xl p-4 border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-clinic-mint p-2">
                          <UserCheck className="h-5 w-5 text-clinic-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{apt.patientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc ? getDocName(doc) : "-"} &middot; {svc ? (locale === "ar" ? svc.name_ar : svc.name_fr) : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFinishCall(apt.id)}
                        className="text-clinic-deep hover:bg-clinic-mint bg-transparent"
                      >
                        <CheckCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {locale === "ar" ? "إنهاء النداء" : "Terminer l'appel"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Display state */}
        <div className="flex items-center gap-3 text-sm">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{t("admin_display_state")}:</span>
          {display && <Badge className={displayBadge[display.state].className}>{displayBadge[display.state].label}</Badge>}
        </div>

        {/* Doctor search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={locale === "ar" ? "\u0628\u062D\u062B \u0639\u0646 \u0637\u0628\u064A\u0628..." : "Rechercher un medecin..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Doctor cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSummaries.map(({ doctor, waiting, called, done }) => (
            <Card key={doctor.id} className="border-border/50 hover:border-clinic-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-clinic-mint flex-shrink-0 flex items-center justify-center">
                    {doctor.photoUrl ? (
                      <Image src={doctor.photoUrl || "/placeholder.svg"} alt={getDocName(doctor)} width={48} height={48} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-sm font-bold text-clinic-accent">{getInitials(doctor)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{getDocName(doctor)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {locale === "ar" ? doctor.title_ar : doctor.title_fr}
                    </p>
                  </div>
                </div>

                {/* Status counts */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">{waiting.length} {t("status_waiting")}</Badge>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">{called.length} {t("status_called")}</Badge>
                  <Badge className="bg-clinic-mint text-clinic-deep text-xs">{done.length} {t("status_done")}</Badge>
                </div>

                {/* Next waiting */}
                {waiting.length > 0 && (
                  <div className="text-sm text-muted-foreground mb-4 bg-clinic-soft rounded-lg p-2.5">
                    <span className="font-medium text-foreground">{waiting[0].patientName}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleCallNextForDoctor(doctor.id)}
                    disabled={loading || waiting.length === 0}
                    className="flex-1 bg-clinic-primary hover:bg-clinic-accent text-primary-foreground"
                  >
                    <Phone className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
                    {t("admin_call_next")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectDoctorId(doctor.id)}
                    disabled={waiting.length === 0}
                    className="text-foreground bg-transparent"
                  >
                    {locale === "ar" ? "\u0627\u062E\u062A\u064A\u0627\u0631" : "Choisir"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSummaries.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {t("admin_no_data")}
            </div>
          )}
        </div>

        {/* Select patient modal */}
        <Dialog open={!!selectDoctorId} onOpenChange={(open) => { if (!open) setSelectDoctorId(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {selectDoctorId && doctorMap[selectDoctorId]
                  ? (locale === "ar" ? "\u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0631\u064A\u0636 - " : "Choisir un patient - ") + getDocName(doctorMap[selectDoctorId])
                  : ""}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {locale === "ar" ? "\u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0631\u064A\u0636 \u0644\u0644\u0645\u0646\u0627\u062F\u0627\u0629" : "Choisir un patient a appeler"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {selectDoctorWaiting.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => handleCallSpecific(apt.id)}
                  disabled={loading}
                  className="flex items-center justify-between p-3 rounded-lg bg-clinic-soft hover:bg-clinic-mint transition-colors text-left"
                >
                  <div>
                    <span className="font-bold text-foreground">{apt.patientName}</span>
                  </div>
                  <Phone className="h-4 w-4 text-clinic-accent" />
                </button>
              ))}
              {selectDoctorWaiting.length === 0 && (
                <p className="text-center text-muted-foreground py-4">{t("admin_no_data")}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
