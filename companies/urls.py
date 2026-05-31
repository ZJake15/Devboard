from django.urls import path
from .views import CompanyListView, CompanyDetailView, CompanyRegisterView, MyCompanyView, OTPVerifyView

urlpatterns = [
    path('', CompanyListView.as_view(), name='company-list'),
    path('register/', CompanyRegisterView.as_view(), name='company-register'),
    path('verify-otp/', OTPVerifyView.as_view(), name='company-verify-otp'),
    path('me/', MyCompanyView.as_view(), name='my-company'),
    path('<slug:slug>/', CompanyDetailView.as_view(), name='company-detail'),
]
