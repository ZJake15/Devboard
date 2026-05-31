from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = AuditLog.objects.select_related('user')

        # Admins see everything; regular users see only their own logs
        if not user.is_staff:
            qs = qs.filter(user=user)

        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        return qs


class AuditActionChoicesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([
            {'value': value, 'label': label}
            for value, label in AuditLog.ACTION_CHOICES
        ])
