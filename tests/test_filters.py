"""Tests for job filtering and pagination URL persistence."""
import pytest
from rest_framework.test import APIClient
from accounts.models import Skill
from companies.models import Company
from jobs.models import Job


@pytest.fixture(autouse=True)
def jobs_data(db):
    skill_py = Skill.objects.create(name='Python-F', slug='python-f')
    skill_js = Skill.objects.create(name='JavaScript-F', slug='javascript-f')
    company = Company.objects.create(name='Filter Corp', slug='filter-corp')

    j1 = Job.objects.create(title='Python Dev', company=company, location='Berlin', remote_policy='remote', seniority='mid', is_active=True)
    j1.tech_stack.add(skill_py)

    j2 = Job.objects.create(title='JS Engineer', company=company, location='New York', remote_policy='onsite', seniority='junior', is_active=True)
    j2.tech_stack.add(skill_js)

    j3 = Job.objects.create(title='Python Senior', company=company, location='Berlin', remote_policy='hybrid', seniority='senior', is_active=True)
    j3.tech_stack.add(skill_py)

    # Inactive job — should not appear in default list
    j4 = Job.objects.create(title='Inactive Job', company=company, location='Berlin', remote_policy='remote', seniority='mid', is_active=False)


@pytest.mark.django_db
class TestJobFilters:
    def setup_method(self):
        self.client = APIClient()

    def test_search_by_title(self):
        resp = self.client.get('/api/jobs/?search=Python')
        data = resp.json()
        titles = [r['title'] for r in data['results']]
        assert all('Python' in t for t in titles)
        assert 'JS Engineer' not in titles

    def test_filter_remote_policy(self):
        resp = self.client.get('/api/jobs/?remote_policy=remote')
        results = resp.json()['results']
        assert all(r['remote_policy'] == 'remote' for r in results)

    def test_filter_seniority(self):
        resp = self.client.get('/api/jobs/?seniority=junior')
        results = resp.json()['results']
        assert all(r['seniority'] == 'junior' for r in results)

    def test_filter_by_tech_stack(self):
        resp = self.client.get('/api/jobs/?tech_stack=python-f')
        results = resp.json()['results']
        assert len(results) == 2
        for r in results:
            slugs = [s['slug'] for s in r['tech_stack']]
            assert 'python-f' in slugs

    def test_inactive_jobs_excluded_by_default(self):
        resp = self.client.get('/api/jobs/')
        results = resp.json()['results']
        titles = [r['title'] for r in results]
        assert 'Inactive Job' not in titles

    def test_pagination_contains_next_with_filters(self):
        # Create enough jobs so there is a second page
        company = Company.objects.get(slug='filter-corp')
        skill_py = Skill.objects.get(slug='python-f')
        for i in range(15):
            j = Job.objects.create(title=f'Extra Python {i}', company=company, location='Berlin', remote_policy='remote', seniority='mid', is_active=True)
            j.tech_stack.add(skill_py)

        resp = self.client.get('/api/jobs/?search=Python&page=1')
        data = resp.json()
        assert data['next'] is not None
        # The next link must preserve the search filter
        assert 'search=Python' in data['next']

    def test_filter_combined(self):
        resp = self.client.get('/api/jobs/?search=Python&remote_policy=remote')
        results = resp.json()['results']
        for r in results:
            assert 'Python' in r['title']
            assert r['remote_policy'] == 'remote'
