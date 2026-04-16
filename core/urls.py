from django.urls import path, re_path

from core import views

urlpatterns = [
    # Server-rendered shared list (SEO)
    path("share/<str:token>/", views.shared_list_view, name="shared_list"),
    # Built SPA assets (JS, CSS from frontend/dist/assets/)
    re_path(r"^assets/(?P<path>.+)$", views.spa_asset, name="spa_asset"),
    # React SPA catch-all — must be last
    re_path(r"^(?!api/|_allauth/|admin/|__reload__/|silk/|static/).*$", views.spa_view, name="spa"),
]
