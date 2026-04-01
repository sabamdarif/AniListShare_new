from allauth.account.decorators import verified_email_required
from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from core.models import Category


@login_required
@verified_email_required
def home(request):
    categories = (
        Category.objects.filter(user=request.user).prefetch_related("animes").all()
    )
    return render(request, "core/index.html", {"categories": categories})
