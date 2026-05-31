from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from audit.utils import log_action
from .models import Notification, Profile, Project, Skill
from .serializers import (
    ProfileSerializer,
    ProfileUpdateSerializer,
    ProjectSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    SkillSerializer,
    TierTokenObtainPairSerializer,
    TierTokenRefreshSerializer,
    UserSerializer,
)


class AuthThrottle(AnonRateThrottle):
    rate = '10/minute'
    scope = 'auth'


class TierTokenObtainPairView(TokenObtainPairView):
    serializer_class = TierTokenObtainPairSerializer
    throttle_classes = [AuthThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            try:
                logged_in_user = User.objects.get(username=request.data.get('username'))
                log_action(
                    request, 'user.login', 'User', logged_in_user.pk,
                    metadata={'username': logged_in_user.username},
                    user=logged_in_user,   # request.user is still anonymous at this point
                )
            except User.DoesNotExist:
                pass
        return response


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            log_action(request, 'user.register', 'User', user.pk,
                       {'username': user.username})
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        if self.request.method in ('PUT', 'PATCH'):
            return self.request.user.profile
        return self.request.user

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code in (200, 204):
            log_action(request, 'user.profile_update', 'Profile',
                       request.user.pk, {'fields': list(request.data.keys())})
        return response


class DeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        log_action(request, 'user.delete', 'User', user.pk,
                   {'username': user.username})
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UpgradeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.tier = Profile.TIER_PREMIUM
        profile.save()
        log_action(request, 'user.tier_upgrade', 'Profile', request.user.pk,
                   {'new_tier': 'premium'})
        return Response({'tier': profile.tier})


class TierTokenRefreshView(TokenRefreshView):
    serializer_class = TierTokenRefreshSerializer


class SkillListView(generics.ListAPIView):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class PublicProfileView(generics.RetrieveAPIView):
    """Public developer profile — safe for any authenticated user to view."""
    serializer_class = PublicUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'username'
    queryset = User.objects.select_related('profile').prefetch_related(
        'profile__skills', 'profile__projects', 'profile__projects__tech_stack'
    )


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Project.objects.filter(profile=self.request.user.profile).prefetch_related('tech_stack')

    def perform_create(self, serializer):
        serializer.save(profile=self.request.user.profile)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(profile=self.request.user.profile)


# ── Notifications ─────────────────────────────────────────────────────────────

from rest_framework import serializers as _s

class NotificationSerializer(_s.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'is_read', 'link', 'created_at']
        read_only_fields = ['id', 'created_at']


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')[:50]


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids', [])
        qs = Notification.objects.filter(user=request.user)
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(is_read=True)
        return Response({'marked': qs.count()})
