from django.urls import path
from .views import (
    AvatarUploadView, DeleteAccountView, MeView, NotificationListView, NotificationMarkReadView,
    ProjectDetailView, ProjectListCreateView, PublicProfileView,
    RegisterView, SkillListView, TierTokenObtainPairView, TierTokenRefreshView, UpgradeView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TierTokenObtainPairView.as_view(), name='token_obtain'),
    path('token/refresh/', TierTokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('me/avatar/', AvatarUploadView.as_view(), name='avatar-upload'),
    path('upgrade/', UpgradeView.as_view(), name='upgrade'),
    path('delete/', DeleteAccountView.as_view(), name='delete-account'),
    path('skills/', SkillListView.as_view(), name='skills'),
    path('users/<str:username>/', PublicProfileView.as_view(), name='public-profile'),
    path('me/projects/', ProjectListCreateView.as_view(), name='project-list'),
    path('me/projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('notifications/', NotificationListView.as_view(), name='notifications'),
    path('notifications/mark-read/', NotificationMarkReadView.as_view(), name='notifications-mark-read'),
]
