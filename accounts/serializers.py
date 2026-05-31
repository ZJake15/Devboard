import time
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, Project, Skill


def _bake_account_claims(token, user):
    """Write account_type + tier into any JWT token dict, safe for both account types."""
    token['username'] = user.username
    try:
        if hasattr(user, 'company_profile') and user.company_profile.is_verified:
            token['account_type'] = 'company'
            token['company_id'] = user.company_profile.company.pk
            token['company_name'] = user.company_profile.company.name
            token['tier'] = 'company'
            return
    except Exception:
        pass
    # Developer account (or unverified company — treated as free developer)
    token['account_type'] = 'developer'
    try:
        token['tier'] = user.profile.tier
    except Exception:
        token['tier'] = 'free'


class TierTokenRefreshSerializer(TokenRefreshSerializer):
    """Re-reads tier from DB on every refresh so upgrades take effect immediately."""
    def validate(self, attrs):
        data = super().validate(attrs)
        try:
            refresh = RefreshToken(attrs['refresh'])
            user_id = refresh.get('user_id')
            user = User.objects.select_related('profile', 'company_profile__company').get(pk=user_id)
            access = refresh.access_token
            _bake_account_claims(access, user)
            data['access'] = str(access)
        except Exception:
            pass
        return data


class TierTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        _bake_account_claims(token, user)
        return token


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'slug']


class ProjectSerializer(serializers.ModelSerializer):
    tech_stack = SkillSerializer(many=True, read_only=True)
    tech_stack_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), source='tech_stack', write_only=True, required=False
    )

    class Meta:
        model = Project
        fields = ['id', 'title', 'description', 'url', 'tech_stack', 'tech_stack_ids', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProfileSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True, read_only=True)
    skill_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), source='skills', write_only=True, required=False
    )
    rank = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'tier', 'headline', 'years_experience', 'skills',
            'skill_ids', 'remote_preference', 'rank', 'created_at', 'updated_at',
        ]
        read_only_fields = ['tier', 'rank', 'created_at', 'updated_at']

    def get_rank(self, obj):
        from .rank import compute_rank
        return compute_rank(obj)


class PublicProfileSerializer(serializers.ModelSerializer):
    """Safe public view of a developer — no tier/email/sensitive data."""
    skills = SkillSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    rank = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['headline', 'years_experience', 'skills', 'remote_preference', 'projects', 'rank']

    def get_rank(self, obj):
        from .rank import compute_rank
        return compute_rank(obj)


class PublicUserSerializer(serializers.ModelSerializer):
    profile = PublicProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
        read_only_fields = ['id']


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, default='')
    last_name = serializers.CharField(max_length=150, required=False, default='')

    # Honeypot fields — real users never fill these
    website = serializers.CharField(required=False, allow_blank=True, default='')
    nickname = serializers.CharField(required=False, allow_blank=True, default='')

    # Time-trap: JS sets this to the current timestamp when the form renders
    form_rendered_at = serializers.FloatField(write_only=True)

    MIN_FILL_SECONDS = 2.0

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already registered.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        # Honeypot check
        if attrs.get('website') or attrs.get('nickname'):
            raise serializers.ValidationError('Bot detected.')

        # Time-trap check
        rendered_at = attrs.get('form_rendered_at', 0)
        elapsed = time.time() - rendered_at
        if elapsed < self.MIN_FILL_SECONDS:
            raise serializers.ValidationError('Submission too fast — please try again.')

        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})

        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        validated_data.pop('website', None)
        validated_data.pop('nickname', None)
        validated_data.pop('form_rendered_at', None)

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        Profile.objects.create(user=user)
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    skill_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), source='skills', required=False
    )

    class Meta:
        model = Profile
        fields = ['headline', 'years_experience', 'skill_ids', 'remote_preference']

    def update(self, instance, validated_data):
        skills = validated_data.pop('skills', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if skills is not None:
            instance.skills.set(skills)
        instance.save()
        return instance
