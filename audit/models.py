from django.db import models
from django.contrib.auth.models import User


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('user.register',        'User Registered'),
        ('user.login',           'User Logged In'),
        ('user.logout',          'User Logged Out'),
        ('user.profile_update',  'Profile Updated'),
        ('user.tier_upgrade',    'Tier Upgraded'),
        ('job.view',             'Job Viewed'),
        ('application.create',   'Application Created'),
        ('application.update',   'Application Updated'),
        ('application.delete',   'Application Deleted'),
        ('saved_search.create',  'Saved Search Created'),
        ('saved_search.delete',  'Saved Search Deleted'),
        ('salary.submit',        'Salary Submitted'),
        ('user.delete',          'Account Deleted'),
    ]

    user = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.PositiveIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        who = self.user.username if self.user else 'anonymous'
        return f'[{self.created_at:%Y-%m-%d %H:%M}] {who} — {self.action}'
