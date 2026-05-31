from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'username', 'action', 'action_display',
            'resource_type', 'resource_id', 'ip_address',
            'metadata', 'created_at',
        ]

    def get_username(self, obj):
        return obj.user.username if obj.user else 'anonymous'
