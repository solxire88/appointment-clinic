from django.urls import path

from display import views

urlpatterns = [
    path("display", views.public_display_state),
    path("admin/display", views.admin_display_state),
]
