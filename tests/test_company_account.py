"""Tests for company account deletion (cascades company + jobs)."""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from companies.models import Company, CompanyProfile
from jobs.models import Job


def _company_token(user, company):
    t = AccessToken.for_user(user)
    t['account_type'] = 'company'
    t['company_id'] = company.pk
    t['tier'] = 'company'
    return str(t)


@pytest.fixture
def company_account(db):
    u = User.objects.create_user('acme_admin', 'admin@acme.com', 'pass')
    company = Company.objects.create(name='Acme Inc', slug='acme-inc')
    CompanyProfile.objects.create(user=u, company=company, is_verified=True)
    Job.objects.create(title='Engineer', company=company, location='Remote',
                       posted_by=u, is_active=True)
    return u, company


@pytest.mark.django_db
class TestCompanyAccountDeletion:
    def test_delete_removes_company_and_jobs(self, company_account):
        user, company = company_account
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {_company_token(user, company)}')

        resp = client.delete('/api/auth/delete/')
        assert resp.status_code == 204

        assert not User.objects.filter(pk=user.pk).exists()
        assert not Company.objects.filter(pk=company.pk).exists()
        assert not CompanyProfile.objects.filter(company_id=company.pk).exists()
        assert not Job.objects.filter(company_id=company.pk).exists()
