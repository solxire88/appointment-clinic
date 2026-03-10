"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useI18n } from "@/src/lib/i18n/context"
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from "@/src/lib/api/doctors"
import { getServices } from "@/src/lib/api/services"
import type { Doctor, Service, WeeklySchedule, WeekDay } from "@/src/lib/types"
import { WEEK_DAYS, DEFAULT_SCHEDULE } from "@/src/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"

interface DoctorForm {
  name_fr: string
  name_ar: string
  title_fr: string
  title_ar: string
  serviceId: string
  photoUrl: string
  schedule: WeeklySchedule
}

const emptyForm: DoctorForm = {
  name_fr: "", name_ar: "", title_fr: "", title_ar: "", serviceId: "", photoUrl: "",
  schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)),
}

export default function AdminDoctorsPage() {
  const { t, locale } = useI18n()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [form, setForm] = useState<DoctorForm>(emptyForm)
  const [formError, setFormError] = useState("")

  const load = () => {
    getDoctors("admin").then(setDoctors)
    getServices("admin").then(setServices)
  }

  useEffect(() => { load() }, [])

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]))

  const dayKeys: Record<WeekDay, string> = {
    mon: "day_mon", tue: "day_tue", wed: "day_wed", thu: "day_thu",
    fri: "day_fri", sat: "day_sat", sun: "day_sun",
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)) })
    setFormError("")
    setDialogOpen(true)
  }

  const openEdit = (doc: Doctor) => {
    setEditing(doc)
    setForm({
      name_fr: doc.name_fr,
      name_ar: doc.name_ar,
      title_fr: doc.title_fr,
      title_ar: doc.title_ar,
      serviceId: doc.serviceId,
      photoUrl: doc.photoUrl || "",
      schedule: JSON.parse(JSON.stringify(doc.schedule)),
    })
    setFormError("")
    setDialogOpen(true)
  }

  const toggleScheduleSlot = (day: WeekDay, slot: "morning" | "evening") => {
    const newSchedule = { ...form.schedule }
    newSchedule[day] = { ...newSchedule[day], [slot]: !newSchedule[day][slot] }
    setForm({ ...form, schedule: newSchedule })
  }

  const setScheduleCapacity = (day: WeekDay, slot: "morning" | "evening", value: number) => {
    const newSchedule = { ...form.schedule }
    const key = slot === "morning" ? "morningCapacity" : "eveningCapacity"
    newSchedule[day] = {
      ...newSchedule[day],
      [key]: Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0),
    }
    setForm({ ...form, schedule: newSchedule })
  }

  const getCapacitySummary = (doc: Doctor) => {
    const morningValues = WEEK_DAYS.map((day) => doc.schedule[day].morningCapacity)
    const eveningValues = WEEK_DAYS.map((day) => doc.schedule[day].eveningCapacity)
    const minMorning = Math.min(...morningValues)
    const maxMorning = Math.max(...morningValues)
    const minEvening = Math.min(...eveningValues)
    const maxEvening = Math.max(...eveningValues)

    const morningText = minMorning === maxMorning ? String(minMorning) : `${minMorning}-${maxMorning}`
    const eveningText = minEvening === maxEvening ? String(minEvening) : `${minEvening}-${maxEvening}`

    return `${morningText}M / ${eveningText}S`
  }

  const handleSave = async () => {
    if (!form.name_fr || !form.name_ar || !form.title_fr || !form.title_ar || !form.serviceId) {
      setFormError(locale === "ar"
        ? "\u064A\u0631\u062C\u0649 \u0645\u0644\u0621 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 (FR + AR)"
        : "Veuillez remplir tous les champs obligatoires (FR + AR)")
      return
    }
    // Validate at least one enabled slot
    const hasSlot = WEEK_DAYS.some((d) => form.schedule[d].morning || form.schedule[d].evening)
    if (!hasSlot) {
      setFormError(locale === "ar"
        ? "\u064A\u062C\u0628 \u062A\u0641\u0639\u064A\u0644 \u0641\u062A\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"
        : "Au moins un creneau doit etre active")
      return
    }
    setFormError("")

    const fallbackMorning = Math.max(
      0,
      ...WEEK_DAYS.map((day) => form.schedule[day].morningCapacity)
    )
    const fallbackEvening = Math.max(
      0,
      ...WEEK_DAYS.map((day) => form.schedule[day].eveningCapacity)
    )

    const data = {
      name_fr: form.name_fr,
      name_ar: form.name_ar,
      title_fr: form.title_fr,
      title_ar: form.title_ar,
      serviceId: form.serviceId,
      photoUrl: form.photoUrl || undefined,
      schedule: form.schedule,
      capacityMorning: fallbackMorning,
      capacityEvening: fallbackEvening,
    }
    if (editing) {
      await updateDoctor(editing.id, data)
    } else {
      await createDoctor(data)
    }
    setDialogOpen(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (confirm(t("admin_confirm_delete"))) {
      await deleteDoctor(id)
      load()
    }
  }

  const getDocName = (doc: Doctor) => locale === "ar" ? doc.name_ar : doc.name_fr
  const getInitials = (doc: Doctor) => doc.name_fr.split(" ").filter((_, i) => i > 0).map((n) => n[0]).join("").slice(0, 2)

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("admin_doctors")}</h1>
          <Button onClick={openCreate} className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
            <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("admin_add")}
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{locale === "ar" ? "\u0627\u0644\u0635\u0648\u0631\u0629" : "Photo"}</TableHead>
                  <TableHead>{t("admin_name_fr")}</TableHead>
                  <TableHead>{t("admin_name_ar")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("admin_title_fr")}</TableHead>
                  <TableHead>{t("admin_select_service")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{locale === "ar" ? "\u0627\u0644\u0633\u0639\u0629" : "Cap."}</TableHead>
                  <TableHead className="text-right">{t("admin_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {t("admin_no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  doctors.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-clinic-mint flex items-center justify-center flex-shrink-0">
                          {doc.photoUrl ? (
                            <Image src={doc.photoUrl || "/placeholder.svg"} alt={getDocName(doc)} width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-xs font-bold text-clinic-accent">{getInitials(doc)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{doc.name_fr}</TableCell>
                      <TableCell dir="rtl" className="text-foreground">{doc.name_ar}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{doc.title_fr}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-clinic-soft text-clinic-deep">
                          {locale === "ar" ? serviceMap[doc.serviceId]?.name_ar : serviceMap[doc.serviceId]?.name_fr}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {getCapacitySummary(doc)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(doc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? t("admin_edit") : t("admin_add")}</DialogTitle>
              <DialogDescription className="sr-only">
                {editing ? t("admin_edit") : t("admin_add")} {t("admin_doctors")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-5">
              {formError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
              )}

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("admin_name_fr")} *</Label>
                  <Input value={form.name_fr} onChange={(e) => setForm({ ...form, name_fr: e.target.value })} placeholder="Dr. ..." />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("admin_name_ar")} *</Label>
                  <Input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="\u062F. ..." />
                </div>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t("admin_title_fr")} *</Label>
                  <Input value={form.title_fr} onChange={(e) => setForm({ ...form, title_fr: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("admin_title_ar")} *</Label>
                  <Input dir="rtl" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
                </div>
              </div>

              {/* Service */}
              <div className="flex flex-col gap-2">
                <Label>{t("admin_select_service")} *</Label>
                <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v })}>
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

              {/* Photo URL */}
              <div className="flex flex-col gap-2">
                <Label>{locale === "ar" ? "\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629" : "Photo URL"}</Label>
                <Input
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  dir="ltr"
                />
                {form.photoUrl && (
                  <div className="mt-1 flex justify-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-clinic-mint border-2 border-border">
                      <Image src={form.photoUrl || "/placeholder.svg"} alt="Preview" width={64} height={64} className="object-cover w-full h-full" />
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule grid */}
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-semibold">{t("schedule_title")}</Label>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-2 text-left font-medium text-muted-foreground">{locale === "ar" ? "\u0627\u0644\u064A\u0648\u0645" : "Jour"}</th>
                        <th className="p-2 text-center font-medium text-muted-foreground">{t("schedule_morning")} / {t("capacity_morning")}</th>
                        <th className="p-2 text-center font-medium text-muted-foreground">{t("schedule_evening")} / {t("capacity_evening")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {WEEK_DAYS.map((day) => (
                        <tr key={day} className="border-t border-border/50">
                          <td className="p-2 font-medium text-foreground">{t(dayKeys[day] as never)}</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleScheduleSlot(day, "morning")}
                                className={`w-7 h-7 rounded-md text-xs font-semibold transition-all ${
                                  form.schedule[day].morning
                                    ? "bg-clinic-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                                aria-label={`${t(dayKeys[day] as never)} ${t("schedule_morning")}`}
                              >
                                {form.schedule[day].morning ? "M" : "-"}
                              </button>
                              <Input
                                type="number"
                                min="0"
                                className="h-7 w-16 text-xs"
                                value={form.schedule[day].morningCapacity}
                                onChange={(e) =>
                                  setScheduleCapacity(day, "morning", Number(e.target.value))
                                }
                              />
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleScheduleSlot(day, "evening")}
                                className={`w-7 h-7 rounded-md text-xs font-semibold transition-all ${
                                  form.schedule[day].evening
                                    ? "bg-clinic-accent text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                                aria-label={`${t(dayKeys[day] as never)} ${t("schedule_evening")}`}
                              >
                                {form.schedule[day].evening ? "S" : "-"}
                              </button>
                              <Input
                                type="number"
                                min="0"
                                className="h-7 w-16 text-xs"
                                value={form.schedule[day].eveningCapacity}
                                onChange={(e) =>
                                  setScheduleCapacity(day, "evening", Number(e.target.value))
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

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
      </div>
    </AdminLayout>
  )
}
