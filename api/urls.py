from django.urls import path

from . import views

urlpatterns = [
    path(
        "anime/category/<int:pk>/",
        views.AnimeListCreateApiView.as_view(),
        name="list_create_anime",
    ),
]
