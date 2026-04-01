from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.models import Anime, Category

from .serializers import AnimeSerializer


class AnimeListCreateApiView(generics.ListCreateAPIView):
    queryset = Anime.objects.prefetch_related("seasons").select_related("category")
    serializer_class = AnimeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(
            category__user=self.request.user, category_id=self.kwargs["pk"]
        )

    def perform_create(self, serializer):
        serializer.save(category_id=self.kwargs["pk"])


class AnimeCreateApiView(generics.CreateAPIView):
    serializer_class = AnimeSerializer
    permission_classes = [IsAuthenticated]
