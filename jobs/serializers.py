from django.db.models import Avg, Count, Max, Min
from rest_framework import serializers

from accounts.models import Skill
from accounts.serializers import SkillSerializer
from companies.serializers import CompanySerializer

from .models import Application, CompanyRating, Job, SalarySubmission, SavedSearch


class JobSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    tech_stack = SkillSerializer(many=True, read_only=True)
    salary_range = serializers.SerializerMethodField()
    application_link = serializers.SerializerMethodField()
    match_score = serializers.SerializerMethodField()
    is_stale = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'title', 'company', 'location', 'remote_policy',
            'tech_stack', 'seniority', 'salary_range', 'application_link',
            'salary_verified', 'posted_at', 'repost_count', 'is_active',
            'salary_band_hint', 'match_score', 'is_stale',
        ]

    def _is_premium(self) -> bool:
        request = self.context.get('request')
        if not request or not request.auth:
            return False
        tier = request.auth.get('tier')
        return tier in ('premium', 'company')

    def get_salary_range(self, obj):
        if self._is_premium():
            return {
                'masked': False,
                'min': obj.salary_min,
                'max': obj.salary_max,
                'currency': obj.currency,
            }
        return {
            'masked': True,
            'hint': obj.salary_band_hint or 'Competitive salary',
            'message': 'Upgrade to reveal the exact salary range',
        }

    def get_application_link(self, obj):
        if self._is_premium():
            return {'masked': False, 'url': obj.application_link}
        return {'masked': True, 'message': 'Premium members apply directly'}

    def get_match_score(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None

        try:
            profile = request.user.profile
        except Exception:
            return None

        user_skills = set(profile.skills.values_list('id', flat=True))
        job_skills = set(obj.tech_stack.values_list('id', flat=True))

        skill_score = 0
        if job_skills:
            matched = len(user_skills & job_skills)
            skill_score = matched / len(job_skills)
            missing_skills = list(
                Skill.objects.filter(id__in=(job_skills - user_skills)).values_list('name', flat=True)
            )
        else:
            matched = 0
            missing_skills = []

        seniority_order = ['intern', 'junior', 'mid', 'senior', 'lead', 'principal']
        user_exp = profile.years_experience
        seniority_map = {
            'intern': (0, 1), 'junior': (1, 3), 'mid': (3, 6),
            'senior': (6, 10), 'lead': (8, 15), 'principal': (12, 99),
        }
        lo, hi = seniority_map.get(obj.seniority, (0, 99))
        seniority_score = 1.0 if lo <= user_exp <= hi else 0.5

        remote_score = 1.0 if (
            obj.remote_policy == 'remote' or
            profile.remote_preference == obj.remote_policy
        ) else 0.6

        total = round((skill_score * 0.6 + seniority_score * 0.25 + remote_score * 0.15) * 100)

        result = {'score': total}
        if self._is_premium():
            result['breakdown'] = {
                'skills_matched': matched,
                'skills_total': len(job_skills),
                'missing_skills': missing_skills,
                'seniority_match': seniority_score == 1.0,
                'remote_match': remote_score == 1.0,
            }
        return result

    def get_is_stale(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        age_days = (timezone.now() - obj.posted_at).days
        return obj.repost_count >= 3 or age_days >= 60


class JobCreateSerializer(serializers.ModelSerializer):
    tech_stack_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all(), source='tech_stack', required=False
    )

    class Meta:
        model = Job
        fields = [
            'id', 'title', 'location', 'remote_policy', 'tech_stack_ids',
            'seniority', 'salary_min', 'salary_max', 'currency',
            'salary_verified', 'salary_band_hint', 'application_link',
            'repost_count', 'is_active',
        ]
        read_only_fields = ['id']


class SalarySubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalarySubmission
        fields = ['id', 'role', 'location', 'seniority', 'amount', 'currency', 'created_at']
        read_only_fields = ['id', 'created_at']


class SalaryBenchmarkSerializer(serializers.Serializer):
    role = serializers.CharField()
    location = serializers.CharField()
    seniority = serializers.CharField()
    count = serializers.IntegerField()
    min_salary = serializers.IntegerField()
    max_salary = serializers.IntegerField()
    avg_salary = serializers.FloatField()
    p25 = serializers.IntegerField()
    p50 = serializers.IntegerField()
    p75 = serializers.IntegerField()


class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ['id', 'name', 'query_params', 'notify', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CompanyRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyRating
        fields = ['id', 'rating', 'feedback', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_rating(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError('Rating must be between 0 and 100.')
        return value


class ApplicationSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    job_id = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.all(), source='job', write_only=True
    )
    applicant_username = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'job', 'job_id', 'status', 'notes', 'order',
            'applicant_username', 'interview_scheduled_at', 'interview_notes',
            'offer_response', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_applicant_username(self, obj):
        return obj.user.username if obj.user else None

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
