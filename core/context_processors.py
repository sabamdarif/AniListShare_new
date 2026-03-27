from django.conf import settings

from AniListShare.settings import WEBSITE_NAME


def website_name(request):
    return {"WEBSITE_NAME": settings.WEBSITE_NAME}
