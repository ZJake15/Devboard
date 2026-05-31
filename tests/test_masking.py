"""
Tests for field-level salary/link masking in JobSerializer.
Critical invariant: free-tier and anonymous requests must NEVER receive
real salary integers or the real application_link URL in their response body.
"""
import json
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Profile, Skill
from companies.models import Company
from jobs.models import Job


@pytest.fixture
def skill(db):
    return Skill.objects.create(name='Python', slug='python')


@pytest.fixture
def company(db):
    return Company.objects.create(name='Acme Corp', slug='acme-corp', website='https://acme.example.com')


@pytest.fixture
def job(db, company, skill):
    j = Job.objects.create(
        title='Test Engineer',
        company=company,
        location='Remote',
        remote_policy='remote',
        seniority='mid',
        salary_min=120000,
        salary_max=160000,
        currency='USD',
        salary_verified=True,
        salary_band_hint='Above average for Test roles',
        application_link='https://acme.example.com/apply/secret',
        is_active=True,
    )
    j.tech_stack.add(skill)
    return j


def _make_token(user, tier):
    token = AccessToken.for_user(user)
    token['tier'] = tier
    return str(token)


@pytest.fixture
def free_user(db):
    u = User.objects.create_user('freetest', 'free@test.com', 'pass')
    Profile.objects.create(user=u, tier='free')
    return u


@pytest.fixture
def premium_user(db):
    u = User.objects.create_user('premiumtest', 'premium@test.com', 'pass')
    Profile.objects.create(user=u, tier='premium')
    return u


@pytest.fixture
def anon_client():
    return APIClient()


@pytest.fixture
def free_client(free_user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {_make_token(free_user, "free")}')
    return client


@pytest.fixture
def premium_client(premium_user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {_make_token(premium_user, "premium")}')
    return client


class TestSalaryMasking:
    def test_anonymous_salary_is_masked(self, anon_client, job):
        url = f'/api/jobs/{job.pk}/'
        resp = anon_client.get(url)
        assert resp.status_code == 200
        data = resp.json()
        assert data['salary_range']['masked'] is True
        assert 'hint' in data['salary_range']

    def test_free_salary_is_masked(self, free_client, job):
        url = f'/api/jobs/{job.pk}/'
        resp = free_client.get(url)
        assert resp.status_code == 200
        data = resp.json()
        assert data['salary_range']['masked'] is True

    def test_premium_salary_is_unmasked(self, premium_client, job):
        url = f'/api/jobs/{job.pk}/'
        resp = premium_client.get(url)
        assert resp.status_code == 200
        data = resp.json()
        assert data['salary_range']['masked'] is False
        assert data['salary_range']['min'] == 120000
        assert data['salary_range']['max'] == 160000

    def test_free_no_real_salary_in_response_body(self, free_client, job):
        """Regression: raw salary integers must never appear anywhere in free-tier response."""
        resp = free_client.get(f'/api/jobs/{job.pk}/')
        body = resp.content.decode()
        assert '120000' not in body
        assert '160000' not in body

    def test_anon_no_real_salary_in_response_body(self, anon_client, job):
        """Regression: raw salary integers must never appear in anonymous response."""
        resp = anon_client.get(f'/api/jobs/{job.pk}/')
        body = resp.content.decode()
        assert '120000' not in body
        assert '160000' not in body


class TestApplicationLinkMasking:
    def test_anonymous_link_is_masked(self, anon_client, job):
        resp = anon_client.get(f'/api/jobs/{job.pk}/')
        data = resp.json()
        assert data['application_link']['masked'] is True
        assert 'url' not in data['application_link']

    def test_free_link_is_masked(self, free_client, job):
        resp = free_client.get(f'/api/jobs/{job.pk}/')
        data = resp.json()
        assert data['application_link']['masked'] is True
        assert 'url' not in data['application_link']

    def test_premium_link_is_unmasked(self, premium_client, job):
        resp = premium_client.get(f'/api/jobs/{job.pk}/')
        data = resp.json()
        assert data['application_link']['masked'] is False
        assert data['application_link']['url'] == 'https://acme.example.com/apply/secret'

    def test_free_no_real_link_in_response_body(self, free_client, job):
        """Regression: real application URL must never appear in free-tier response."""
        resp = free_client.get(f'/api/jobs/{job.pk}/')
        body = resp.content.decode()
        assert 'apply/secret' not in body

    def test_anon_no_real_link_in_response_body(self, anon_client, job):
        resp = anon_client.get(f'/api/jobs/{job.pk}/')
        body = resp.content.decode()
        assert 'apply/secret' not in body


class TestMaskingOnListEndpoint:
    def test_list_free_salary_masked(self, free_client, job):
        resp = free_client.get('/api/jobs/')
        assert resp.status_code == 200
        items = resp.json()['results']
        assert len(items) >= 1
        for item in items:
            assert item['salary_range']['masked'] is True

    def test_list_premium_salary_unmasked(self, premium_client, job):
        resp = premium_client.get('/api/jobs/')
        items = resp.json()['results']
        assert len(items) >= 1
        for item in items:
            assert item['salary_range']['masked'] is False
