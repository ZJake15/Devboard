import django_filters
from .models import Job


class JobFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search', label='Search')
    location = django_filters.CharFilter(field_name='location', lookup_expr='icontains')
    remote_policy = django_filters.MultipleChoiceFilter(choices=Job.REMOTE_CHOICES)
    seniority = django_filters.MultipleChoiceFilter(choices=Job.SENIORITY_CHOICES)
    tech_stack = django_filters.BaseInFilter(field_name='tech_stack__slug', lookup_expr='in')
    salary_min = django_filters.NumberFilter(field_name='salary_min', lookup_expr='gte')
    salary_verified = django_filters.BooleanFilter(field_name='salary_verified')
    is_active = django_filters.BooleanFilter(field_name='is_active')

    class Meta:
        model = Job
        fields = [
            'search', 'location', 'remote_policy', 'seniority',
            'tech_stack', 'salary_min', 'salary_verified', 'is_active',
        ]

    def filter_search(self, queryset, name, value):
        from django.db.models import Q
        return queryset.filter(
            Q(title__icontains=value) |
            Q(company__name__icontains=value) |
            Q(tech_stack__name__icontains=value) |
            Q(location__icontains=value)
        ).distinct()
