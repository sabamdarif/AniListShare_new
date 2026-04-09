import os

from django.conf import settings
from django.http import Http404, HttpResponse, FileResponse
from django.shortcuts import render
from django.views.decorators.cache import never_cache

from core.models import ShareLink


# ─── SPA entry point ────────────────────────────────────────────────────
FRONTEND_DIR = os.path.join(settings.BASE_DIR, "frontend", "dist")
ASSETS_DIR = os.path.realpath(os.path.join(FRONTEND_DIR, "assets"))


@never_cache
def spa_view(request):
    """Serve the React SPA index.html for all client-side routes."""
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(open(index_path, "rb"), content_type="text/html")
    # Fallback: in dev mode the SPA might not be built yet
    return HttpResponse(
        "<h1>Frontend not built</h1>"
        "<p>Run <code>cd frontend && npm run build</code> first, "
        "or use <code>npm run dev</code> on port 5173 for development.</p>",
        content_type="text/html",
        status=503,
    )


# ─── Serve SPA static assets (JS, CSS, images from frontend/dist/assets/) ───
def spa_asset(request, path):
    """Serve built frontend assets from frontend/dist/assets/."""
    if not path:
        raise Http404

    normalized = path.replace("\\", "/")
    if normalized.startswith("/") or any(part == ".." for part in normalized.split("/")):
        raise Http404

    if (
        not normalized
        or os.path.isabs(normalized)
        or normalized == ".."
        or normalized.startswith(".." + os.sep)
    ):
        raise Http404

    filepath = os.path.abspath(os.path.realpath(os.path.join(ASSETS_DIR, normalized)))
    if os.path.commonpath([ASSETS_DIR, filepath]) != ASSETS_DIR:
        raise Http404
    if os.path.exists(filepath) and os.path.isfile(filepath):
        return FileResponse(open(filepath, "rb"))
    raise Http404


# ─── Shared list — kept as server-side for SEO ──────────────────────────
def shared_list_view(request, token):
    """Server-rendered shared list page for SEO/social link previews."""
    try:
        share = ShareLink.objects.select_related("user").get(token=token)
    except ShareLink.DoesNotExist:
        raise Http404("This shared link does not exist or has been disabled.")

    owner = share.user

    context = {
        "owner_name": owner.get_full_name() or owner.username,
        "share_token": token,
    }

    return render(request, "core/shared_list.html", context)
