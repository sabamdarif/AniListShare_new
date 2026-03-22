from django.http import JsonResponse
from django.shortcuts import render

from animelist.models import Anime, Category


def home(request):
    categories = (
        Category.objects.filter(user=request.user)
        .prefetch_related("anime_related_data")
        .all()
    )
    return render(request, "animelist/index.html", {"categories": categories})


def api_anime_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    category_id = request.GET.get("category_id")
    if not category_id:
        return JsonResponse({"error": "category_id required"}, status=400)

    anime_quarry = Anime.objects.filter(
        category_id=category_id, category__user=request.user
    ).order_by("order")

    data = []
    for a in anime_quarry:
        data.append(
            {
                "id": a.id,
                "name": a.name,
                "thumbnail_url": a.thumbnail_url,
                "mal_id": a.mal_id,
                "language": a.language,
                "stars": a.stars,
                "order": a.order,
                "comments": a.comments,
                "season": a.season,
            }
        )

    return JsonResponse({"anime": data})
