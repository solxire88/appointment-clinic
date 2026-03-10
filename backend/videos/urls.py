from django.urls import path

from videos import views

urlpatterns = [
    path("videos", views.public_videos),
    path("videos/file/<str:video_id>", views.public_video_file),
    path("admin/videos", views.admin_videos),
    path("admin/videos/upload", views.admin_upload_video),
    path("admin/videos/reorder", views.admin_reorder_videos),
    path("admin/videos/<str:video_id>", views.admin_video_detail),
]
