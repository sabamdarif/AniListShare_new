from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.models import Anime

from .serializers import AnimeSerializer


class AnimeListApiView(generics.ListAPIView):
    queryset = Anime.objects.prefetch_related("seasons").select_related("category")
    serializer_class = AnimeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(
            category__user=self.request.user, category_id=self.kwargs["pk"]
        )
