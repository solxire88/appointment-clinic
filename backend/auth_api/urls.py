from django.urls import path

from auth_api import views

urlpatterns = [
    path("auth/login", views.login_view),
    path("auth/session", views.session_view),
    path("auth/logout", views.logout_view),
]
