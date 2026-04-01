from django.urls import path

from . import views

urlpatterns = [
    path(
        "list-anime/category/<int:pk>/",
        views.AnimeListApiView.as_view(),
        name="list_anime",
    )
]
