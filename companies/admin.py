from django.contrib import admin
from .models import Company, CompanyProfile


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'avg_response_days', 'response_rate']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'company', 'is_verified', 'created_at']
    list_filter = ['is_verified']
    actions = ['verify_accounts']

    def verify_accounts(self, request, queryset):
        queryset.update(is_verified=True)
    verify_accounts.short_description = 'Mark selected accounts as verified'
