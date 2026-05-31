from django.contrib import admin
from .models import Application, CompanyRating, Job, SalarySubmission, SavedSearch


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'location', 'seniority', 'remote_policy', 'salary_verified', 'is_active', 'posted_at']
    list_filter = ['seniority', 'remote_policy', 'salary_verified', 'is_active']
    search_fields = ['title', 'company__name', 'location']
    filter_horizontal = ['tech_stack']
    date_hierarchy = 'posted_at'


@admin.register(SalarySubmission)
class SalarySubmissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'location', 'seniority', 'amount', 'currency', 'created_at']
    list_filter = ['seniority', 'currency']
    search_fields = ['role', 'location']


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'notify', 'created_at']
    list_filter = ['notify']


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['user', 'job', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['user__username', 'job__title']


@admin.register(CompanyRating)
class CompanyRatingAdmin(admin.ModelAdmin):
    list_display = ['application', 'rating', 'created_at']
    list_filter = ['rating']
    search_fields = ['application__user__username', 'application__job__title']
