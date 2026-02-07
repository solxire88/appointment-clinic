"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { useI18n } from "@/src/lib/i18n/context"
import { getServices } from "@/src/lib/api/services"
import { listAvailableDoctors } from "@/src/lib/api/doctors"
import { createAppointment, getAppointmentTicket, getSlotAvailability } from "@/src/lib/api/appointments"
import type { Service, Doctor, AppointmentSlot } from "@/src/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Calendar, CheckCircle2, Shield, AlertCircle, Download } from "lucide-react"
import { generateTicketPDF } from "@/src/lib/utils/ticket-generator"
import { formatClinicDateFromIso, getClinicDateString } from "@/src/lib/utils/clinic-date"

interface FormErrors {
  date?: string
  slot?: string
  serviceId?: string
  doctorId?: string
  patientName?: string
  patientAge?: string
  patientPhone?: string
}

interface SlotAvailability {
  morning: { count: number; capacity: number; full: boolean }
  evening: { count: number; capacity: number; full: boolean }
}

interface ConfirmationData {
  queueNumber: number
  date: string
  slot: string
  serviceName: string
  doctorName?: string
  appointmentId: string
}

export function AppointmentForm() {
  const { t, locale } = useI18n()
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null)
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability | null>(null)
  const [capacityError, setCapacityError] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  // Form fields
  const [date, setDate] = useState("")
  const [slot, setSlot] = useState<AppointmentSlot | "">("")
  const [serviceId, setServiceId] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientAge, setPatientAge] = useState("")
  const [patientPhone, setPatientPhone] = useState("")
  const [availableDoctors, setAvailableDoctors] = useState<typeof doctors>([])

  useEffect(() => {
    getServices().then(setServices)
  }, [])

  useEffect(() => {
    setDoctorId("")
  }, [serviceId])

  // Fetch available doctors when date/slot/service changes
  useEffect(() => {
    if (date && slot && serviceId) {
      listAvailableDoctors({ date, slot: slot as AppointmentSlot, serviceId }).then((available) => {
        setAvailableDoctors(available.map((a) => a.doctor))
        setDoctors(available.map((a) => a.doctor))
        // If current doctor is no longer available, clear it
        if (doctorId && !available.some((a) => a.doctor.id === doctorId)) {
          setDoctorId("")
        }
      })
    } else {
      setAvailableDoctors([])
      setDoctors([])
    }
  }, [date, slot, serviceId, doctorId])

  // Fetch slot availability when date changes
  useEffect(() => {
    if (date && serviceId) {
      getSlotAvailability(date, serviceId).then((avail) => {
        setSlotAvailability(avail)
        // If current slot is now full, clear it
        if (slot === "morning" && avail.morning.full) {
          setSlot("")
        } else if (slot === "evening" && avail.evening.full) {
          setSlot("")
        }
      })
    } else {
      setSlotAvailability(null)
    }
  }, [date, serviceId, slot])

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!date) newErrors.date = t("validation_required")
    else {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) newErrors.date = t("validation_past_date")
    }

    if (!slot) newErrors.slot = t("validation_required")
    if (!serviceId) newErrors.serviceId = t("validation_required")
    if (!doctorId) newErrors.doctorId = t("validation_required")

    if (!patientName) newErrors.patientName = t("validation_required")
    else if (patientName.length < 3) newErrors.patientName = t("validation_name_min")

    if (!patientAge) newErrors.patientAge = t("validation_required")
    else if (Number.isNaN(Number(patientAge)) || Number(patientAge) <= 0 || Number(patientAge) > 120)
      newErrors.patientAge = t("validation_age")

    if (!patientPhone) newErrors.patientPhone = t("validation_required")
    else if (patientPhone.replace(/\s/g, "").length < 8)
      newErrors.patientPhone = t("validation_phone")

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [date, slot, serviceId, doctorId, patientName, patientAge, patientPhone, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || isSubmitting) return
    setCapacityError("")

    setIsSubmitting(true)
    try {
      const result = await createAppointment({
        date,
        slot: slot as AppointmentSlot,
        serviceId,
        doctorId,
        patientName,
        patientAge: Number(patientAge),
        patientPhone,
      })

      const service = services.find((s) => s.id === serviceId)
      const doctor = doctors.find((d) => d.id === doctorId)

      setConfirmation({
        queueNumber: result.queueNumber,
        date,
        slot: slot === "morning" ? t("appointment_morning") : t("appointment_evening"),
        serviceName: locale === "ar" ? (service?.name_ar || "") : (service?.name_fr || ""),
        doctorName: doctor ? (locale === "ar" ? (doctor.name_ar || doctor.name_fr) : doctor.name_fr) : undefined,
        appointmentId: result.appointment.id,
      })

      // Reset form
      setDate("")
      setSlot("")
      setServiceId("")
      setDoctorId("")
      setPatientName("")
      setPatientAge("")
      setPatientPhone("")
      setErrors({})
      setSlotAvailability(null)
      setAvailableDoctors([])
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_FULL") {
        setCapacityError(
          locale === "ar"
            ? "\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0639\u062F \u0645\u0643\u062A\u0645\u0644. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0641\u062A\u0631\u0629 \u0623\u062E\u0631\u0649."
            : "Ce creneau est complet. Veuillez choisir un autre creneau."
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const todayStr = getClinicDateString()

  const morningFull = slotAvailability?.morning.full ?? false
  const eveningFull = slotAvailability?.evening.full ?? false
  const fullLabel = locale === "ar" ? "\u0645\u0643\u062A\u0645\u0644" : "Complet"
  const chooseOtherSlot = locale === "ar"
    ? "\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0623\u062E\u0631\u0649"
    : "Veuillez choisir l'autre creneau"

  return (
    <section id="appointment" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-clinic-accent mb-3">
            {locale === "ar" ? "\u062D\u062C\u0632 \u0633\u0631\u064A\u0639" : "Reservation rapide"}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            {t("appointment_title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            {t("appointment_subtitle")}
          </p>
        </div>

        <Card className="max-w-2xl mx-auto shadow-lg border-border/50">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              {/* Capacity error */}
              {capacityError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{capacityError}</p>
                </div>
              )}

              {/* Date & Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="appt-date">{t("appointment_date")} *</Label>
                  <Input
                    id="appt-date"
                    type="date"
                    min={todayStr}
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setCapacityError("") }}
                    aria-invalid={!!errors.date}
                  />
                  {errors.date && (
                    <p className="text-sm text-destructive">{errors.date}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_slot")} *</Label>
                  <Select value={slot} onValueChange={(v) => { setSlot(v as AppointmentSlot); setCapacityError("") }}>
                    <SelectTrigger aria-invalid={!!errors.slot}>
                      <SelectValue placeholder={t("appointment_slot")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning" disabled={morningFull}>
                        {t("appointment_morning")} {morningFull ? `(${fullLabel})` : ""}
                      </SelectItem>
                      <SelectItem value="evening" disabled={eveningFull}>
                        {t("appointment_evening")} {eveningFull ? `(${fullLabel})` : ""}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.slot && (
                    <p className="text-sm text-destructive">{errors.slot}</p>
                  )}
                  {/* Helper text when one slot is full */}
                  {date && (morningFull || eveningFull) && !(morningFull && eveningFull) && (
                    <p className="text-xs text-clinic-accent">{chooseOtherSlot}</p>
                  )}
                  {date && morningFull && eveningFull && (
                    <p className="text-xs text-destructive">
                      {locale === "ar"
                        ? "\u062C\u0645\u064A\u0639 \u0627\u0644\u0641\u062A\u0631\u0627\u062A \u0645\u0643\u062A\u0645\u0644\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u064A\u0648\u0645"
                        : "Tous les creneaux sont complets pour cette date"}
                    </p>
                  )}
                </div>
              </div>

              {/* Availability indicator */}
              {date && slotAvailability && (
                <div className="flex gap-3">
                  <div className={`flex-1 rounded-lg p-2.5 text-center text-xs font-medium ${
                    morningFull
                      ? "bg-destructive/10 text-destructive"
                      : "bg-clinic-soft text-clinic-deep"
                  }`}>
                    {t("appointment_morning")}: {slotAvailability.morning.count}/{slotAvailability.morning.capacity}
                    {morningFull && ` - ${fullLabel}`}
                  </div>
                  <div className={`flex-1 rounded-lg p-2.5 text-center text-xs font-medium ${
                    eveningFull
                      ? "bg-destructive/10 text-destructive"
                      : "bg-clinic-soft text-clinic-deep"
                  }`}>
                    {t("appointment_evening")}: {slotAvailability.evening.count}/{slotAvailability.evening.capacity}
                    {eveningFull && ` - ${fullLabel}`}
                  </div>
                </div>
              )}

              {/* Service & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_service")} *</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger aria-invalid={!!errors.serviceId}>
                      <SelectValue placeholder={t("appointment_select_service")} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {locale === "ar" ? s.name_ar : s.name_fr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.serviceId && (
                    <p className="text-sm text-destructive">{errors.serviceId}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_doctor")} *</Label>
                  <Select value={doctorId} onValueChange={setDoctorId} disabled={!serviceId || availableDoctors.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={availableDoctors.length === 0 && serviceId ? t("no_doctor_available") : t("appointment_select_doctor")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDoctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {locale === "ar" ? (d.name_ar || d.name_fr) : d.name_fr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.doctorId && (
                    <p className="text-sm text-destructive">{errors.doctorId}</p>
                  )}
                  {availableDoctors.length === 0 && serviceId && date && slot && (
                    <p className="text-xs text-destructive">{t("no_doctor_available")}</p>
                  )}
                </div>
              </div>

              {/* Patient info */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="appt-name">{t("appointment_name")} *</Label>
                <Input
                  id="appt-name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  aria-invalid={!!errors.patientName}
                />
                {errors.patientName && (
                  <p className="text-sm text-destructive">{errors.patientName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="appt-age">{t("appointment_age")} *</Label>
                  <Input
                    id="appt-age"
                    type="number"
                    min="0"
                    max="120"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    aria-invalid={!!errors.patientAge}
                  />
                  {errors.patientAge && (
                    <p className="text-sm text-destructive">{errors.patientAge}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="appt-phone">{t("appointment_phone")} *</Label>
                  <Input
                    id="appt-phone"
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    aria-invalid={!!errors.patientPhone}
                  />
                  {errors.patientPhone && (
                    <p className="text-sm text-destructive">{errors.patientPhone}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || (date !== "" && morningFull && eveningFull)}
                className="w-full bg-clinic-primary hover:bg-clinic-accent text-primary-foreground"
              >
                {isSubmitting ? (
                  t("appointment_submitting")
                ) : (
                  <>
                    <Calendar className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
                    {t("appointment_submit")}
                  </>
                )}
              </Button>

              {/* Privacy note */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{t("appointment_privacy")}</p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={!!confirmation} onOpenChange={() => setConfirmation(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-clinic-deep">
                <CheckCircle2 className="h-6 w-6" />
                {t("appointment_success_title")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("appointment_summary")}
              </DialogDescription>
            </DialogHeader>
            {confirmation && (
              <div className="flex flex-col gap-4">
                {/* Queue number */}
                <div className="text-center py-6 rounded-xl bg-clinic-soft">
                  <p className="text-sm text-muted-foreground mb-1">
                    {t("appointment_queue_number")}
                  </p>
                  <p className="text-6xl font-bold text-clinic-deep">
                    {confirmation.queueNumber}
                  </p>
                </div>

                {/* Summary */}
                <div className="flex flex-col gap-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("appointment_date_label")}</span>
                    <span className="font-medium text-foreground">{confirmation.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("appointment_slot_label")}</span>
                    <span className="font-medium text-foreground">{confirmation.slot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("appointment_service_label")}</span>
                    <span className="font-medium text-foreground">{confirmation.serviceName}</span>
                  </div>
                  {confirmation.doctorName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("appointment_doctor_label")}</span>
                      <span className="font-medium text-foreground">{confirmation.doctorName}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={async () => {
                    if (confirmation) {
                      try {
                        const ticket = await getAppointmentTicket(confirmation.appointmentId)
                        await generateTicketPDF({
                          queueNumber: ticket.doctorQueueNumber,
                          date: formatClinicDateFromIso(ticket.appointmentDate),
                          slot: ticket.slot === "MORNING" ? t("appointment_morning") : t("appointment_evening"),
                          service_fr: ticket.service.nameFr,
                          service_ar: ticket.service.nameAr,
                          doctor_fr: ticket.doctor?.nameFr,
                          doctor_ar: ticket.doctor?.nameAr,
                          patientName: ticket.patientName,
                          patientPhone: ticket.patientPhone,
                          locale,
                        })
                      } catch (err) {
                        console.error("[v0] Download ticket error:", err)
                      }
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("ticket_download")}
                </Button>

                <Button
                  onClick={() => setConfirmation(null)}
                  className="w-full bg-clinic-primary hover:bg-clinic-accent text-primary-foreground"
                >
                  {t("appointment_close")}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
