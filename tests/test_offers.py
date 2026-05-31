"""Tests for developer responding to a company job offer."""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Notification, Profile
from companies.models import Company, CompanyProfile
from jobs.models import Application, Job


def _token(user, tier='premium', account_type='developer'):
    t = AccessToken.for_user(user)
    t['tier'] = tier
    t['account_type'] = account_type
    return str(t)


@pytest.fixture
def company_owner(db):
    u = User.objects.create_user('acme_hr', 'hr@acme.com', 'pass')
    company = Company.objects.create(name='Acme', slug='acme')
    CompanyProfile.objects.create(user=u, company=company, is_verified=True)
    return u, company


@pytest.fixture
def developer(db):
    u = User.objects.create_user('dev1', 'dev1@test.com', 'pass')
    Profile.objects.create(user=u, tier='premium')
    return u


@pytest.fixture
def offer(db, company_owner, developer):
    owner, company = company_owner
    job = Job.objects.create(title='Engineer', company=company, location='Remote',
                             posted_by=owner, is_active=True)
    return Application.objects.create(user=developer, job=job, status='offer')


@pytest.mark.django_db
class TestRespondToOffer:
    def _client(self, user):
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {_token(user)}')
        return c

    def test_accept_offer(self, developer, offer, company_owner):
        owner, _ = company_owner
        resp = self._client(developer).post(f'/api/jobs/applications/{offer.pk}/respond/',
                                            {'response': 'accepted'}, format='json')
        assert resp.status_code == 200
        offer.refresh_from_db()
        assert offer.offer_response == 'accepted'
        assert offer.status == 'offer'
        # Company received a notification
        assert Notification.objects.filter(user=owner, title__icontains='accepted').exists()

    def test_decline_offer_moves_to_rejected(self, developer, offer):
        resp = self._client(developer).post(f'/api/jobs/applications/{offer.pk}/respond/',
                                            {'response': 'declined'}, format='json')
        assert resp.status_code == 200
        offer.refresh_from_db()
        assert offer.offer_response == 'declined'
        assert offer.status == 'rejected'

    def test_cannot_respond_to_non_offer(self, developer, offer):
        offer.status = 'applied'
        offer.save()
        resp = self._client(developer).post(f'/api/jobs/applications/{offer.pk}/respond/',
                                            {'response': 'accepted'}, format='json')
        assert resp.status_code == 400

    def test_cannot_respond_to_others_offer(self, offer, db):
        other = User.objects.create_user('intruder', 'x@test.com', 'pass')
        Profile.objects.create(user=other, tier='free')
        resp = self._client(other).post(f'/api/jobs/applications/{offer.pk}/respond/',
                                        {'response': 'accepted'}, format='json')
        assert resp.status_code == 404
