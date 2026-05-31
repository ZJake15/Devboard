"""Tests for crowd salary benchmarks — anonymization guaranteed."""
import pytest
from rest_framework.test import APIClient
from jobs.models import SalarySubmission


@pytest.fixture
def submissions(db):
    for amount in [80000, 90000, 100000, 110000, 120000]:
        SalarySubmission.objects.create(
            role='Backend Engineer', location='Berlin', seniority='mid',
            amount=amount, currency='EUR',
        )


@pytest.mark.django_db
class TestSalaryBenchmark:
    def setup_method(self):
        self.client = APIClient()

    def test_benchmark_returns_aggregates(self, submissions):
        resp = self.client.get('/api/jobs/salary/benchmark/?role=Backend+Engineer&location=Berlin&seniority=mid')
        assert resp.status_code == 200
        data = resp.json()
        assert data['count'] == 5
        assert data['min_salary'] == 80000
        assert data['max_salary'] == 120000
        assert 'p25' in data
        assert 'p50' in data
        assert 'p75' in data

    def test_benchmark_no_individual_records(self, submissions):
        """Response must not reveal individual submission data."""
        resp = self.client.get('/api/jobs/salary/benchmark/?role=Backend+Engineer&location=Berlin&seniority=mid')
        data = resp.json()
        assert 'id' not in data
        assert 'user' not in data
        assert 'submissions' not in data

    def test_benchmark_no_data_returns_404(self, db):
        resp = self.client.get('/api/jobs/salary/benchmark/?role=Wizard&location=Narnia')
        assert resp.status_code == 404

    def test_salary_submission_creates_record(self, db):
        payload = {'role': 'Frontend Dev', 'location': 'Amsterdam', 'seniority': 'mid', 'amount': 75000, 'currency': 'EUR'}
        resp = self.client.post('/api/jobs/salary/submit/', payload, format='json')
        assert resp.status_code == 201
        assert SalarySubmission.objects.filter(role='Frontend Dev').exists()
