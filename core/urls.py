from django.urls import path

from core import views

urlpatterns = [
    path("", views.home, name="home_page"),
    path("api/anime-list/", views.api_anime_list, name="api_anime_list"),
    path("api/bulk-add-anime/", views.api_bulk_add_anime, name="api_bulk_add_anime"),
    path("api/add-category/", views.api_add_category, name="api_add_category"),
]
