"""Utility for creating in-app notifications."""
from .models import Notification


def notify(user, notif_type: str, title: str, message: str = '', link: str = '', application_id: int = None):
    Notification.objects.create(
        user=user,
        type=notif_type,
        title=title,
        message=message,
        link=link,
        application_id=application_id,
    )
