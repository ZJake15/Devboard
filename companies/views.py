from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from audit.utils import log_action
from .models import Company, CompanyProfile
from .serializers import CompanyRegisterSerializer, CompanySerializer, OTPVerifySerializer


class CompanyListView(generics.ListAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.AllowAny]


class CompanyDetailView(generics.RetrieveAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class CompanyRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CompanyRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            log_action(request, 'user.register', 'CompanyProfile', user.pk,
                       {'username': user.username, 'account_type': 'company'})
            return Response(
                {'detail': 'Registration successful. Enter the OTP sent by the admin.',
                 'username': user.username},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OTPVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            profile = user.company_profile
            profile.is_verified = True
            profile.save()

            log_action(request, 'user.login', 'CompanyProfile', user.pk,
                       {'username': user.username, 'account_type': 'company'},
                       user=user)

            # Issue JWT pair
            refresh = RefreshToken.for_user(user)
            refresh['account_type'] = 'company'
            refresh['company_id'] = profile.company.pk
            refresh['company_name'] = profile.company.name
            refresh['username'] = user.username
            refresh['tier'] = 'company'

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'company': CompanySerializer(profile.company).data,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MyCompanyView(generics.RetrieveUpdateAPIView):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.company_profile.company

    def check_permissions(self, request):
        super().check_permissions(request)
        if not request.auth or request.auth.get('account_type') != 'company':
            self.permission_denied(request, message='Company accounts only.')
