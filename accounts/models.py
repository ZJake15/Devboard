from django.db import models
from django.contrib.auth.models import User


class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Profile(models.Model):
    TIER_FREE = 'free'
    TIER_PREMIUM = 'premium'
    TIER_CHOICES = [(TIER_FREE, 'Free'), (TIER_PREMIUM, 'Premium')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default=TIER_FREE)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    headline = models.CharField(max_length=200, blank=True)
    years_experience = models.PositiveSmallIntegerField(default=0)
    skills = models.ManyToManyField(Skill, blank=True, related_name='profiles')
    remote_preference = models.CharField(
        max_length=10,
        choices=[('onsite', 'On-site'), ('hybrid', 'Hybrid'), ('remote', 'Remote')],
        default='remote',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} ({self.tier})'

    @property
    def is_premium(self):
        return self.tier == self.TIER_PREMIUM


class Notification(models.Model):
    TYPE_CHOICES = [
        ('new_application',      'New Application'),
        ('application_approved', 'Application Approved'),
        ('interview_scheduled',  'Interview Scheduled'),
        ('job_offer',            'Job Offer Received'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, db_index=True)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    link = models.CharField(max_length=200, blank=True)
    application_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} — {self.type}'


class Project(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True)
    tech_stack = models.ManyToManyField(Skill, blank=True, related_name='projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.profile.user.username} — {self.title}'

    class Meta:
        ordering = ['-created_at']
