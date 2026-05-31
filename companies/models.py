from django.db import models
from django.contrib.auth.models import User

DEMO_OTP = '123456'


class Company(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    logo_url = models.URLField(blank=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)
    avg_response_days = models.FloatField(null=True, blank=True)
    response_rate = models.FloatField(null=True, blank=True, help_text='0.0–1.0')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Companies'
        ordering = ['name']


class CompanyProfile(models.Model):
    """Links a Django User to a Company for employer accounts."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company_profile')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='accounts')
    is_verified = models.BooleanField(default=False)
    # Fixed demo OTP — in production this would be generated and emailed
    otp_code = models.CharField(max_length=6, default=DEMO_OTP)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} @ {self.company.name}'
