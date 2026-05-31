from .models import AuditLog


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(request, action, resource_type='', resource_id=None, metadata=None, user=None):
    # Allow callers to pass a user explicitly (e.g. login, where request.user is still anonymous)
    resolved_user = user or (request.user if request.user.is_authenticated else None)
    AuditLog.objects.create(
        user=resolved_user,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=get_client_ip(request),
        metadata=metadata or {},
    )
