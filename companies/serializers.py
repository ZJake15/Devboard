from django.contrib.auth.models import User
from django.utils.text import slugify
from rest_framework import serializers

from .models import Company, CompanyProfile, DEMO_OTP


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'slug', 'logo', 'logo_url', 'website', 'description',
            'avg_response_days', 'response_rate',
        ]
        read_only_fields = ['slug', 'logo']


class CompanyRegisterSerializer(serializers.Serializer):
    # Company details
    company_name = serializers.CharField(max_length=200)
    company_website = serializers.URLField(required=False, allow_blank=True, default='')
    company_description = serializers.CharField(required=False, allow_blank=True, default='')

    # Admin (employer) account
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already registered.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')

        # Create or reuse the company slug
        slug = slugify(validated_data['company_name'])
        base_slug, n = slug, 1
        while Company.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{n}'
            n += 1

        company = Company.objects.create(
            name=validated_data['company_name'],
            slug=slug,
            website=validated_data.get('company_website', ''),
            description=validated_data.get('company_description', ''),
        )

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )

        CompanyProfile.objects.create(
            user=user,
            company=company,
            is_verified=False,
            otp_code=DEMO_OTP,
        )
        return user


class OTPVerifySerializer(serializers.Serializer):
    username = serializers.CharField()
    otp_code = serializers.CharField(max_length=6)

    def validate(self, attrs):
        try:
            user = User.objects.get(username=attrs['username'])
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid username.')

        try:
            profile = user.company_profile
        except CompanyProfile.DoesNotExist:
            raise serializers.ValidationError('No pending company registration found.')

        if profile.is_verified:
            raise serializers.ValidationError('Account already verified.')

        if attrs['otp_code'] != profile.otp_code:
            raise serializers.ValidationError('Incorrect OTP. Please try again.')

        attrs['user'] = user
        return attrs
