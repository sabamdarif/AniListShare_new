from rest_framework import serializers

from core.models import Anime, Category, Season


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = (
            "number",
            "total_episodes",
            "watched_episodes",
            "comment",
            "is_completed",
        )
        read_only_fields = ("is_completed",)


class AnimeSerializer(serializers.ModelSerializer):
    seasons = SeasonSerializer(many=True)

    class Meta:
        model = Anime
        fields = (
            "id",
            "name",
            "thumbnail_url",
            "language",
            "stars",
            "order",
            "seasons",
        )
        read_only_fields = ("id",)

    def create(self, validated_data):
        seasons_data = validated_data.pop("seasons", [])
        anime = Anime.objects.create(**validated_data)
        for season_data in seasons_data:
            Season.objects.create(anime=anime, **season_data)
        return anime

    def update(self, instance, validated_data):
        seasons_data = validated_data.pop("seasons", [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        instance.seasons.all().delete()
        for season_data in seasons_data:
            Season.objects.create(anime=instance, **season_data)

        return instance


class CategorySerializer(serializers.ModelSerializer):
    animes = AnimeSerializer(many=True)

    class Meta:
        model = Category
        fields = ("id", "name", "order", "animes")
        read_only_fields = "id"
