from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'username', 'action', 'resource_type', 'resource_id', 'ip_address']
    list_filter = ['action', 'resource_type']
    search_fields = ['user__username', 'ip_address']
    readonly_fields = ['user', 'action', 'resource_type', 'resource_id', 'ip_address', 'metadata', 'created_at']
    date_hierarchy = 'created_at'

    def username(self, obj):
        return obj.user.username if obj.user else '—'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
