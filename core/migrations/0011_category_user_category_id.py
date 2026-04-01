from django.db import migrations, models


def backfill_user_category_ids(apps, schema_editor):
    Category = apps.get_model("core", "Category")
    from django.contrib.auth import get_user_model

    User = get_user_model()

    for user_id in Category.objects.values_list("user_id", flat=True).distinct():
        cats = Category.objects.filter(user_id=user_id).order_by("order", "pk")
        for idx, cat in enumerate(cats, start=1):
            cat.user_category_id = idx
            cat.save(update_fields=["user_category_id"])


def reverse_backfill(apps, schema_editor):
    pass  # No reverse needed; field will be removed on reverse


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0010_alter_season_number_to_float"),
    ]

    operations = [
        # Phase 1: add nullable field
        migrations.AddField(
            model_name="category",
            name="user_category_id",
            field=models.PositiveIntegerField(null=True),
        ),
        # Phase 2: backfill
        migrations.RunPython(backfill_user_category_ids, reverse_backfill),
        # Phase 3: make non-nullable with default, add unique constraint
        migrations.AlterField(
            model_name="category",
            name="user_category_id",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AlterUniqueTogether(
            name="category",
            unique_together={("user", "user_category_id")},
        ),
    ]
