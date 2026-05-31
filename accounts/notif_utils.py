from .models import Notification


def send_notification(user, notif_type: str, title: str, message: str = '', link: str = '', application_id: int = None):
    Notification.objects.create(
        user=user,
        type=notif_type,
        title=title,
        message=message,
        link=link,
        application_id=application_id,
    )
