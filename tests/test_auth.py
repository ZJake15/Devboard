"""Tests for registration honeypot + time-trap, and JWT tier claim."""
import time
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Profile


REGISTER_URL = '/api/auth/register/'
TOKEN_URL = '/api/auth/token/'


def _register_payload(**overrides):
    base = {
        'username': 'newuser',
        'email': 'new@test.com',
        'password': 'StrongPass!1',
        'password_confirm': 'StrongPass!1',
        'form_rendered_at': time.time() - 5,  # submitted 5s after render
        'website': '',
        'nickname': '',
    }
    base.update(overrides)
    return base


@pytest.mark.django_db
class TestHoneypot:
    def test_website_honeypot_rejects(self):
        client = APIClient()
        payload = _register_payload(website='http://spam.example.com')
        resp = client.post(REGISTER_URL, payload, format='json')
        assert resp.status_code == 400

    def test_nickname_honeypot_rejects(self):
        client = APIClient()
        payload = _register_payload(nickname='spambot')
        resp = client.post(REGISTER_URL, payload, format='json')
        assert resp.status_code == 400

    def test_clean_form_accepted(self):
        client = APIClient()
        payload = _register_payload()
        resp = client.post(REGISTER_URL, payload, format='json')
        assert resp.status_code == 201


@pytest.mark.django_db
class TestTimeTrap:
    def test_too_fast_submission_rejected(self):
        client = APIClient()
        payload = _register_payload(
            username='fastbot',
            email='fast@test.com',
            form_rendered_at=time.time() - 0.5,  # only 0.5s elapsed
        )
        resp = client.post(REGISTER_URL, payload, format='json')
        assert resp.status_code == 400

    def test_normal_speed_accepted(self):
        client = APIClient()
        payload = _register_payload(
            username='normaluser',
            email='normal@test.com',
            form_rendered_at=time.time() - 3,
        )
        resp = client.post(REGISTER_URL, payload, format='json')
        assert resp.status_code == 201


@pytest.mark.django_db
class TestJWTTierClaim:
    def test_free_token_has_tier_free(self):
        u = User.objects.create_user('tiertest', 'tier@test.com', 'pass')
        Profile.objects.create(user=u, tier='free')
        token = AccessToken.for_user(u)
        # Simulate TierTokenObtainPairSerializer baking tier in
        token['tier'] = u.profile.tier
        assert token['tier'] == 'free'

    def test_premium_token_has_tier_premium(self):
        u = User.objects.create_user('premium_tier', 'pt@test.com', 'pass')
        Profile.objects.create(user=u, tier='premium')
        token = AccessToken.for_user(u)
        token['tier'] = u.profile.tier
        assert token['tier'] == 'premium'

    def test_login_returns_tier_in_token(self):
        u = User.objects.create_user('logintest', 'login@test.com', 'TestPass!1')
        Profile.objects.create(user=u, tier='premium')
        client = APIClient()
        resp = client.post(TOKEN_URL, {'username': 'logintest', 'password': 'TestPass!1'}, format='json')
        assert resp.status_code == 200
        # Decode token payload to verify tier claim
        import base64, json as _json
        access = resp.json()['access']
        payload_b64 = access.split('.')[1]
        padding = 4 - len(payload_b64) % 4
        payload = _json.loads(base64.urlsafe_b64decode(payload_b64 + '=' * padding))
        assert payload.get('tier') == 'premium'
