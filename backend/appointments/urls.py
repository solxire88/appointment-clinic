from django.urls import path

from appointments import views

urlpatterns = [
    path("public/availability", views.public_availability),
    path("appointments", views.public_create_appointment),
    path("appointments/<str:appointment_id>", views.public_get_appointment),
    path("admin/appointments", views.admin_appointments),
    path("admin/appointments/<str:appointment_id>", views.admin_appointment_detail),
    path("admin/stats", views.admin_stats),
    path("admin/waiting-room/call-next", views.admin_call_next),
    path("admin/waiting-room/call-specific", views.admin_call_specific),
]
