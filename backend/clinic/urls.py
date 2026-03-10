from django.urls import path

from clinic import views

urlpatterns = [
    path("public/services", views.public_services),
    path("public/doctors", views.public_doctors),
    path("admin/services", views.admin_services),
    path("admin/services/<str:service_id>", views.admin_service_detail),
    path("admin/doctors", views.admin_doctors),
    path("admin/doctors/<str:doctor_id>", views.admin_doctor_detail),
]
