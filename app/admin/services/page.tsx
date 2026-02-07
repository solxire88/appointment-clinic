"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useI18n } from "@/src/lib/i18n/context"
import { getServices, createService, updateService, deleteService } from "@/src/lib/api/services"
import type { Service } from "@/src/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2 } from "lucide-react"

export default function AdminServicesPage() {
  const { t, locale } = useI18n()
  const [services, setServices] = useState<Service[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState({ name_fr: "", name_ar: "", description_fr: "", description_ar: "", icon: "activity" })

  const loadServices = () => getServices("admin").then(setServices)

  useEffect(() => { loadServices() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name_fr: "", name_ar: "", description_fr: "", description_ar: "", icon: "activity" })
    setDialogOpen(true)
  }

  const openEdit = (svc: Service) => {
    setEditing(svc)
    setForm({
      name_fr: svc.name_fr,
      name_ar: svc.name_ar,
      description_fr: svc.description_fr,
      description_ar: svc.description_ar,
      icon: svc.icon,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (editing) {
      await updateService(editing.id, form)
    } else {
      await createService(form)
    }
    setDialogOpen(false)
    loadServices()
  }

  const handleDelete = async (id: string) => {
    if (confirm(t("admin_confirm_delete"))) {
      await deleteService(id)
      loadServices()
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("admin_services")}</h1>
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
                  <TableHead>{t("admin_name_fr")}</TableHead>
                  <TableHead>{t("admin_name_ar")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("admin_desc_fr")}</TableHead>
                  <TableHead className="text-right">{t("admin_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t("admin_no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell className="font-medium text-foreground">{svc.name_fr}</TableCell>
                      <TableCell dir="rtl">{svc.name_ar}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                        {svc.description_fr}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(svc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(svc.id)} className="text-destructive hover:text-destructive">
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? t("admin_edit") : t("admin_add")}</DialogTitle>
              <DialogDescription className="sr-only">
                {editing ? t("admin_edit") : t("admin_add")} {t("admin_services")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("admin_name_fr")}</Label>
                <Input value={form.name_fr} onChange={(e) => setForm({ ...form, name_fr: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin_name_ar")}</Label>
                <Input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin_desc_fr")}</Label>
                <Textarea value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} rows={2} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("admin_desc_ar")}</Label>
                <Textarea dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
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
