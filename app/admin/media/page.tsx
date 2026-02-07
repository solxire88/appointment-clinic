"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { useI18n } from "@/src/lib/i18n/context"
import type { ClinicVideo } from "@/src/lib/types"
import {
  listAdminVideos,
  addVideo,
  updateVideo,
  deleteVideo,
  reorderVideos,
  toggleVideoEnabled,
} from "@/src/lib/api/videos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Film,
  Pencil,
  Info,
  Upload,
} from "lucide-react"

export default function AdminMediaPage() {
  const { t, locale } = useI18n()
  const [videos, setVideos] = useState<ClinicVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingVideo, setEditingVideo] = useState<ClinicVideo | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<ClinicVideo | null>(null)

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAdminVideos()
      setVideos(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    try {
      await addVideo(uploadFile, uploadTitle || undefined)
      setUploadTitle("")
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setShowAddDialog(false)
      await fetchVideos()
    } finally {
      setUploading(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleVideoEnabled(id, enabled)
    await fetchVideos()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteVideo(deleteTarget.id)
    setDeleteTarget(null)
    await fetchVideos()
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const ids = videos.map((v) => v.id)
    const temp = ids[index]
    ids[index] = ids[index - 1]
    ids[index - 1] = temp
    await reorderVideos(ids)
    await fetchVideos()
  }

  const handleMoveDown = async (index: number) => {
    if (index === videos.length - 1) return
    const ids = videos.map((v) => v.id)
    const temp = ids[index]
    ids[index] = ids[index + 1]
    ids[index + 1] = temp
    await reorderVideos(ids)
    await fetchVideos()
  }

  const handleSaveTitle = async () => {
    if (!editingVideo) return
    await updateVideo(editingVideo.id, { title: editTitle })
    setEditingVideo(null)
    setEditTitle("")
    await fetchVideos()
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("media_title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("media_subtitle")}</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground gap-2 mt-3 sm:mt-0"
          >
            <Plus className="h-4 w-4" />
            {t("media_add")}
          </Button>
        </div>

        {/* Tip banner */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-clinic-soft p-4">
          <Info className="h-5 w-5 text-clinic-accent mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">{t("media_tip")}</p>
        </div>

        {/* Video list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-clinic-primary" />
          </div>
        ) : videos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{t("media_no_videos")}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t("media_no_videos_desc")}</p>
              </div>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("media_add")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {videos.map((video, index) => (
              <Card key={video.id} className={`transition-opacity ${!video.enabled ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Video preview thumbnail */}
                    <div className="shrink-0 w-36 h-20 rounded-lg bg-foreground/5 overflow-hidden relative">
                      <video
                        src={video.src}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedData={(e) => {
                          // Seek to 1s for thumbnail
                          const el = e.currentTarget
                          if (el.duration > 1) el.currentTime = 1
                        }}
                      />
                      {!video.enabled && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <span className="text-xs font-medium text-muted-foreground">
                            {t("media_disabled")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        #{index + 1} &middot;{" "}
                        {new Date(video.createdAt).toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-DZ")}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Enabled toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs h-7 px-2.5 ${video.enabled ? "bg-clinic-primary/10 text-clinic-primary border-clinic-primary/30 hover:bg-clinic-primary/20" : "bg-transparent text-muted-foreground"}`}
                        onClick={() => handleToggle(video.id, !video.enabled)}
                        aria-label={video.enabled ? t("media_enabled") : t("media_disabled")}
                      >
                        {video.enabled ? t("media_enabled") : t("media_disabled")}
                      </Button>

                      {/* Reorder */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === videos.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>

                      {/* Edit title */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingVideo(video)
                          setEditTitle(video.title)
                        }}
                        aria-label={t("admin_edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(video)}
                        aria-label={t("admin_delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Video Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("media_add")}</DialogTitle>
            <DialogDescription>{t("media_subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="video-file" className="text-foreground">{t("media_file_label")}</Label>
              <div
                className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-clinic-primary/50 transition-colors cursor-pointer p-8 bg-muted/30"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click() }}
                role="button"
                tabIndex={0}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploadFile ? uploadFile.name : locale === "ar" ? "انقر لاختيار ملف" : "Cliquez pour choisir un fichier"}
                </p>
                <input
                  ref={fileInputRef}
                  id="video-file"
                  type="file"
                  accept="video/mp4,video/webm"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setUploadFile(f)
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="video-title" className="text-foreground">{t("media_title_label")}</Label>
              <Input
                id="video-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={locale === "ar" ? "مثال: فيديو ترحيبي" : "Ex: Video de bienvenue"}
                className="text-foreground"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="bg-transparent text-foreground">
                {t("admin_cancel")}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground"
              >
                {uploading
                  ? (locale === "ar" ? "جاري الرفع..." : "Envoi...")
                  : t("media_add")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Title Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={(open) => { if (!open) setEditingVideo(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("admin_edit")}</DialogTitle>
            <DialogDescription>{locale === "ar" ? "تعديل عنوان الفيديو" : "Modifier le titre de la video"}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-foreground"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingVideo(null)} className="bg-transparent text-foreground">
                {t("admin_cancel")}
              </Button>
              <Button onClick={handleSaveTitle} className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
                {t("admin_save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("media_delete_confirm")}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="bg-transparent text-foreground">
              {t("admin_cancel")}
            </Button>
            <Button onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("admin_delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
