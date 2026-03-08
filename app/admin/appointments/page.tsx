"use client"

import React from "react"
import { useEffect, useState, useCallback } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useI18n } from "@/src/lib/i18n/context"
import {
  getAppointments,
  updateAppointmentStatus,
  createAdminAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/src/lib/api/appointments"
import { getServices } from "@/src/lib/api/services"
import { getDoctors, getDoctorsByService } from "@/src/lib/api/doctors"
import { getClinicDateString } from "@/src/lib/utils/clinic-date"
import type { Appointment, Service, Doctor, AppointmentStatus, AppointmentSlot } from "@/src/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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
import { Plus, Pencil, Trash2, AlertCircle, Search } from "lucide-react"

const statusColors: Record<AppointmentStatus, string> = {
  BOOKED: "bg-slate-100 text-slate-800",
  WAITING: "bg-yellow-100 text-yellow-800",
  CALLED: "bg-blue-100 text-blue-800",
  DONE: "bg-clinic-mint text-clinic-deep",
  NO_SHOW: "bg-red-100 text-red-800",
}

const statusKeys: Record<AppointmentStatus, string> = {
  BOOKED: "status_booked",
  WAITING: "status_waiting",
  CALLED: "status_called",
  DONE: "status_done",
  NO_SHOW: "status_no_show",
}

interface AppointmentFormData {
  date: string
  slot: AppointmentSlot | ""
  serviceId: string
  doctorId: string
  patientName: string
  patientAge: string
  patientPhone: string
  status: AppointmentStatus
}

const emptyForm: AppointmentFormData = {
  date: "",
  slot: "",
  serviceId: "",
  doctorId: "",
  patientName: "",
  patientAge: "",
  patientPhone: "",
  status: "BOOKED",
}

export default function AdminAppointmentsPage() {
  const { t, locale } = useI18n()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [filterDate, setFilterDate] = useState(getClinicDateString())
  const [filterService, setFilterService] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterSlot, setFilterSlot] = useState<AppointmentSlot | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // CRUD dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [form, setForm] = useState<AppointmentFormData>(emptyForm)
  const [formDoctors, setFormDoctors] = useState<Doctor[]>([])
  const [formError, setFormError] = useState("")

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null)

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]))
  const doctorMap = Object.fromEntries(doctors.map((d) => [d.id, d]))

  const loadData = useCallback(async () => {
    const filters: { date?: string; serviceId?: string; status?: AppointmentStatus; slot?: AppointmentSlot } = {}
    if (filterDate) filters.date = filterDate
    if (filterService && filterService !== "all") filters.serviceId = filterService
    if (filterStatus && filterStatus !== "all") filters.status = filterStatus as AppointmentStatus
    if (filterSlot && filterSlot !== "all") filters.slot = filterSlot
    const appts = await getAppointments(Object.keys(filters).length > 0 ? filters : undefined)
    setAppointments(appts)
  }, [filterDate, filterService, filterStatus, filterSlot])

  useEffect(() => {
    getServices("admin").then(setServices)
    getDoctors("admin").then(setDoctors)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const normalizedSearchDigits = searchQuery.replace(/\D/g, "")
  const filteredAppointments = appointments.filter((apt) => {
    if (!normalizedSearch) return true

    const patientName = apt.patientName.toLowerCase()
    const phoneRaw = apt.patientPhone.toLowerCase()
    const phoneDigits = apt.patientPhone.replace(/\D/g, "")

    return (
      patientName.includes(normalizedSearch) ||
      phoneRaw.includes(normalizedSearch) ||
      (normalizedSearchDigits.length > 0 && phoneDigits.includes(normalizedSearchDigits))
    )
  })

  // Load doctors for form when service changes
  useEffect(() => {
    if (form.serviceId) {
      getDoctorsByService(form.serviceId, "admin").then(setFormDoctors)
    } else {
      setFormDoctors([])
    }
  }, [form.serviceId])

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    await updateAppointmentStatus(id, status)
    loadData()
  }

  // Open create dialog
  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, date: getClinicDateString() })
    setFormError("")
    setDialogOpen(true)
  }

  // Open edit dialog
  const openEdit = (apt: Appointment) => {
    setEditing(apt)
    setForm({
      date: apt.date,
      slot: apt.slot,
      serviceId: apt.serviceId,
      doctorId: apt.doctorId || "",
      patientName: apt.patientName,
      patientAge: String(apt.patientAge),
      patientPhone: apt.patientPhone,
      status: apt.status,
    })
    setFormError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.date || !form.slot || !form.serviceId || !form.doctorId || !form.patientName || !form.patientAge || !form.patientPhone) {
      setFormError(locale === "ar" ? "\u064A\u0631\u062C\u0649 \u0645\u0644\u0621 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629" : "Veuillez remplir tous les champs obligatoires")
      return
    }
    const ageValue = Number(form.patientAge)
    if (Number.isNaN(ageValue) || ageValue <= 0 || ageValue > 120) {
      setFormError(locale === "ar" ? "\u0627\u0644\u0639\u0645\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" : "Age invalide")
      return
    }
    setFormError("")

    try {
      let updatedAppointment: Appointment | null = null
      if (editing) {
        updatedAppointment = await updateAppointment(editing.id, {
          date: form.date,
          slot: form.slot as AppointmentSlot,
          serviceId: form.serviceId,
          doctorId: form.doctorId,
          patientName: form.patientName,
          patientAge: Number(form.patientAge),
          patientPhone: form.patientPhone,
          status: form.status,
        })
      } else {
        await createAdminAppointment({
          date: form.date,
          slot: form.slot as AppointmentSlot,
          serviceId: form.serviceId,
          doctorId: form.doctorId,
          patientName: form.patientName,
          patientAge: Number(form.patientAge),
          patientPhone: form.patientPhone,
          status: form.status,
        })
      }
      setDialogOpen(false)
      if (editing && updatedAppointment) {
        let filtersChanged = false
        if (filterDate !== updatedAppointment.date) {
          setFilterDate(updatedAppointment.date)
          filtersChanged = true
        }
        if (filterService && filterService !== "all" && filterService !== updatedAppointment.serviceId) {
          setFilterService("all")
          filtersChanged = true
        }
        if (filterStatus && filterStatus !== "all" && filterStatus !== updatedAppointment.status) {
          setFilterStatus("all")
          filtersChanged = true
        }
        if (filterSlot && filterSlot !== "all" && filterSlot !== updatedAppointment.slot) {
          setFilterSlot(updatedAppointment.slot)
          filtersChanged = true
        }
        if (!filtersChanged) loadData()
      } else {
        loadData()
      }
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_FULL") {
        setFormError(
          locale === "ar"
            ? "\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0639\u062F \u0645\u0643\u062A\u0645\u0644. \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u062D\u0641\u0638."
            : "Ce creneau est complet. Impossible d'enregistrer."
        )
      } else if (err instanceof Error && err.message === "SCHEDULE_UNAVAILABLE") {
        setFormError(
          locale === "ar"
            ? "\u0627\u0644\u0637\u0628\u064A\u0628 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0641\u062A\u0631\u0629."
            : "Le medecin n'est pas disponible pour ce creneau."
        )
      } else {
        setFormError(
          locale === "ar" ? "\u062D\u062F\u062B \u062E\u0637\u0623" : "Une erreur est survenue"
        )
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteAppointment(deleteTarget.id)
    setDeleteTarget(null)
    loadData()
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-foreground">{t("admin_appointments")}</h1>
          <div className="flex items-center gap-2">
            <Button onClick={openCreate} className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
              <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {locale === "ar" ? "\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0639\u062F" : "Creer un rendez-vous"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("admin_filter_date")}</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("appointment_slot")}</label>
                <Select value={filterSlot} onValueChange={(v) => setFilterSlot(v as AppointmentSlot | "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin_all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin_all")}</SelectItem>
                    <SelectItem value="morning">{t("appointment_morning")}</SelectItem>
                    <SelectItem value="evening">{t("appointment_evening")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("admin_filter_service")}</label>
                <Select value={filterService} onValueChange={setFilterService}>
                  <SelectTrigger>
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
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("admin_filter_status")}</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin_all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin_all")}</SelectItem>
                    <SelectItem value="BOOKED">{t("status_booked")}</SelectItem>
                    <SelectItem value="WAITING">{t("status_waiting")}</SelectItem>
                    <SelectItem value="CALLED">{t("status_called")}</SelectItem>
                    <SelectItem value="DONE">{t("status_done")}</SelectItem>
                    <SelectItem value="NO_SHOW">{t("status_no_show")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 relative max-w-md">
              <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="ltr:pl-9 rtl:pr-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  locale === "ar"
                    ? "بحث بالاسم أو رقم الهاتف"
                    : "Rechercher par nom ou telephone"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("appointment_date")}</TableHead>
                  <TableHead>{t("appointment_slot")}</TableHead>
                  <TableHead>{t("appointment_name")}</TableHead>
                  <TableHead>{t("appointment_phone")}</TableHead>
                  <TableHead>{t("appointment_service")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("appointment_doctor")}</TableHead>
                  <TableHead>{t("admin_status")}</TableHead>
                  <TableHead className="text-right">{t("admin_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t("admin_no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((apt) => {
                    const svc = serviceMap[apt.serviceId]
                    const doc = apt.doctorId ? doctorMap[apt.doctorId] : null
                    return (
                      <TableRow key={apt.id}>
                        <TableCell className="text-muted-foreground">{apt.date}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {apt.slot === "morning" ? t("appointment_morning") : t("appointment_evening")}
                        </TableCell>
                        <TableCell className="text-foreground">{apt.patientName}</TableCell>
                        <TableCell className="text-muted-foreground">{apt.patientPhone}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-clinic-soft text-clinic-deep">
                            {svc ? (locale === "ar" ? svc.name_ar : svc.name_fr) : apt.serviceId}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {doc ? (locale === "ar" ? doc.name_ar : doc.name_fr) : "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={apt.status}
                            onValueChange={(v) => handleStatusChange(apt.id, v as AppointmentStatus)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <Badge className={`${statusColors[apt.status]} pointer-events-none`}>
                                {t(statusKeys[apt.status] as never)}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BOOKED">{t("status_booked")}</SelectItem>
                              <SelectItem value="WAITING">{t("status_waiting")}</SelectItem>
                              <SelectItem value="CALLED">{t("status_called")}</SelectItem>
                              <SelectItem value="DONE">{t("status_done")}</SelectItem>
                              <SelectItem value="NO_SHOW">{t("status_no_show")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(apt)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(apt)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editing
                  ? (locale === "ar" ? "\u062A\u0639\u062F\u064A\u0644 \u0645\u0648\u0639\u062F" : "Modifier le rendez-vous")
                  : (locale === "ar" ? "\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0639\u062F" : "Creer un rendez-vous")
                }
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editing ? t("admin_edit") : t("admin_add")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_date")} *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_slot")} *</Label>
                  <Select value={form.slot} onValueChange={(v) => setForm({ ...form, slot: v as AppointmentSlot })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("appointment_slot")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">{t("appointment_morning")}</SelectItem>
                      <SelectItem value="evening">{t("appointment_evening")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_service")} *</Label>
                  <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v, doctorId: "" })}>
                    <SelectTrigger>
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
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_doctor")} *</Label>
                  <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })} disabled={!form.serviceId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("appointment_select_doctor")} />
                    </SelectTrigger>
                    <SelectContent>
                      {formDoctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {locale === "ar" ? d.name_ar : d.name_fr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("appointment_name")} *</Label>
                <Input
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_age")} *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={form.patientAge}
                    onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("appointment_phone")} *</Label>
                  <Input
                    type="tel"
                    value={form.patientPhone}
                    onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                  />
                </div>
              </div>

              {/* Status - only show when editing */}
              {editing && (
                <div className="flex flex-col gap-2">
                  <Label>{t("admin_status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AppointmentStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOOKED">{t("status_booked")}</SelectItem>
                    <SelectItem value="WAITING">{t("status_waiting")}</SelectItem>
                    <SelectItem value="CALLED">{t("status_called")}</SelectItem>
                    <SelectItem value="DONE">{t("status_done")}</SelectItem>
                    <SelectItem value="NO_SHOW">{t("status_no_show")}</SelectItem>
                  </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-foreground">
                  {t("admin_cancel")}
                </Button>
                <Button onClick={handleSave} className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
                  {t("admin_save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">{t("admin_confirm_delete")}</DialogTitle>
              <DialogDescription>
                {deleteTarget && (
                  <>
                    {locale === "ar"
                      ? `\u0647\u0644 \u062A\u0631\u064A\u062F \u062D\u0630\u0641 \u0645\u0648\u0639\u062F ${deleteTarget.patientName}\u061F`
                      : `Voulez-vous supprimer le rendez-vous de ${deleteTarget.patientName} ?`
                    }
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="text-foreground bg-transparent">
                {t("admin_cancel")}
              </Button>
              <Button onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("admin_delete")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
