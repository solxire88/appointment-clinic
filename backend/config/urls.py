from django.urls import include, path

urlpatterns = [
    path("api/", include("auth_api.urls")),
    path("api/", include("clinic.urls")),
    path("api/", include("appointments.urls")),
    path("api/", include("display.urls")),
    path("api/", include("videos.urls")),
]
