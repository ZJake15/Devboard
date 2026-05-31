from django.db import models
from django.contrib.auth.models import User
from accounts.models import Skill
from companies.models import Company


class Job(models.Model):
    REMOTE_CHOICES = [
        ('onsite', 'On-site'),
        ('hybrid', 'Hybrid'),
        ('remote', 'Remote'),
    ]
    SENIORITY_CHOICES = [
        ('intern', 'Intern'),
        ('junior', 'Junior'),
        ('mid', 'Mid'),
        ('senior', 'Senior'),
        ('lead', 'Lead'),
        ('principal', 'Principal'),
    ]

    title = models.CharField(max_length=200)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='jobs')
    location = models.CharField(max_length=200)
    remote_policy = models.CharField(max_length=10, choices=REMOTE_CHOICES, default='hybrid')
    tech_stack = models.ManyToManyField(Skill, blank=True, related_name='jobs')
    seniority = models.CharField(max_length=15, choices=SENIORITY_CHOICES, default='mid')
    salary_min = models.PositiveIntegerField(null=True, blank=True)
    salary_max = models.PositiveIntegerField(null=True, blank=True)
    currency = models.CharField(max_length=3, default='PHP')
    salary_verified = models.BooleanField(default=False)
    salary_band_hint = models.CharField(
        max_length=200, blank=True,
        help_text='Safe teaser shown to free users, e.g. "Top 25% for React roles in Berlin"',
    )
    application_link = models.URLField(blank=True)
    posted_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='posted_jobs',
    )
    posted_at = models.DateTimeField(auto_now_add=True)
    repost_count = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title} @ {self.company.name}'

    class Meta:
        ordering = ['-posted_at']


class SavedSearch(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_searches')
    name = models.CharField(max_length=200)
    query_params = models.JSONField(default=dict)
    notify = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username}: {self.name}'

    class Meta:
        ordering = ['-created_at']


class SalarySubmission(models.Model):
    SENIORITY_CHOICES = Job.SENIORITY_CHOICES

    role = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    seniority = models.CharField(max_length=15, choices=SENIORITY_CHOICES)
    amount = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default='PHP')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.role} / {self.location} / {self.seniority}: {self.amount} {self.currency}'

    class Meta:
        ordering = ['-created_at']


class Application(models.Model):
    STATUS_CHOICES = [
        ('saved', 'Saved'),
        ('applied', 'Applied'),
        ('interview', 'Interview'),
        ('offer', 'Offer'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    OFFER_RESPONSE_CHOICES = [
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='saved')
    notes = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    interview_scheduled_at = models.DateTimeField(null=True, blank=True)
    interview_notes = models.CharField(max_length=500, blank=True)
    offer_response = models.CharField(
        max_length=10, choices=OFFER_RESPONSE_CHOICES, blank=True,
        help_text="Developer's response to a job offer",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} → {self.job.title} [{self.status}]'

    class Meta:
        ordering = ['status', 'order']
        unique_together = [['user', 'job']]


class CompanyRating(models.Model):
    """Rating a company gives a developer after working with them."""
    application = models.OneToOneField(
        Application, on_delete=models.CASCADE, related_name='company_rating'
    )
    rating = models.PositiveSmallIntegerField(
        help_text='Score 0–100. Scores below 30 deduct rank points.'
    )
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.application.job.company.name} → {self.application.user.username}: {self.rating}/100'

    class Meta:
        ordering = ['-created_at']
