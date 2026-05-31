from django.urls import path
from .views import AuditLogListView, AuditActionChoicesView

urlpatterns = [
    path('', AuditLogListView.as_view(), name='audit-log-list'),
    path('actions/', AuditActionChoicesView.as_view(), name='audit-action-choices'),
]
