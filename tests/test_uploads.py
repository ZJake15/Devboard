"""Tests for profile picture / company logo uploads."""
import io
import pytest
from PIL import Image
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Profile


def _png(size=(64, 64), color=(120, 80, 200)):
    buf = io.BytesIO()
    Image.new('RGB', size, color).save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile('pic.png', buf.read(), content_type='image/png')


def _token(user, tier='free', account_type='developer'):
    t = AccessToken.for_user(user)
    t['tier'] = tier
    t['account_type'] = account_type
    return str(t)


@pytest.fixture
def dev(db):
    u = User.objects.create_user('devpic', 'devpic@test.com', 'pass')
    Profile.objects.create(user=u, tier='free')
    return u


@pytest.fixture
def dev_client(dev):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {_token(dev)}')
    return c


@pytest.mark.django_db
class TestAvatarUpload:
    def test_upload_sets_avatar(self, dev_client, dev):
        resp = dev_client.post('/api/auth/me/avatar/', {'avatar': _png()}, format='multipart')
        assert resp.status_code == 200
        assert 'avatar' in resp.json()
        assert resp.json()['avatar']  # non-empty URL
        dev.profile.refresh_from_db()
        assert dev.profile.avatar
        # cleanup file
        dev.profile.avatar.delete(save=True)

    def test_rejects_non_image(self, dev_client):
        bad = SimpleUploadedFile('x.txt', b'not an image', content_type='text/plain')
        resp = dev_client.post('/api/auth/me/avatar/', {'avatar': bad}, format='multipart')
        assert resp.status_code == 400

    def test_requires_auth(self, db):
        resp = APIClient().post('/api/auth/me/avatar/', {'avatar': _png()}, format='multipart')
        assert resp.status_code == 401

    def test_avatar_appears_in_me(self, dev_client, dev):
        dev_client.post('/api/auth/me/avatar/', {'avatar': _png()}, format='multipart')
        me = dev_client.get('/api/auth/me/')
        assert me.status_code == 200
        assert me.json()['profile']['avatar']
        dev.profile.refresh_from_db()
        dev.profile.avatar.delete(save=True)
