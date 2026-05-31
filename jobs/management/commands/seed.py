import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils.text import slugify
from accounts.models import Profile, Skill
from companies.models import Company
from jobs.models import Job, SalarySubmission


SKILLS_DATA = [
    'Python', 'Django', 'FastAPI', 'JavaScript', 'TypeScript', 'React', 'Vue',
    'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP',
    'Go', 'Rust', 'GraphQL', 'REST', 'Terraform', 'CI/CD', 'Linux',
    'Next.js', 'Tailwind CSS', 'MongoDB', 'Elasticsearch',
]

COMPANIES_DATA = [
    {'name': 'Accenture Philippines', 'website': 'https://accenture.com', 'description': 'Global professional services company with a leading digital practice.', 'avg_response_days': 3.5, 'response_rate': 0.85},
    {'name': 'Globe Telecom', 'website': 'https://globe.com.ph', 'description': 'Leading telecommunications company in the Philippines.', 'avg_response_days': 5.0, 'response_rate': 0.72},
    {'name': 'Grab Philippines', 'website': 'https://grab.com', 'description': 'Southeast Asia\'s leading superapp for transport, food, and payments.', 'avg_response_days': 4.0, 'response_rate': 0.91},
    {'name': 'Sprout Solutions', 'website': 'https://sprout.ph', 'description': 'Philippines-based HR and payroll software company.', 'avg_response_days': 6.0, 'response_rate': 0.68},
    {'name': 'KMC Solutions', 'website': 'https://kmc.solutions', 'description': 'Flexible workspace and outsourcing solutions provider.', 'avg_response_days': 8.0, 'response_rate': 0.55},
    {'name': 'PayMongo', 'website': 'https://paymongo.com', 'description': 'Fast-growing Philippine fintech enabling online payments.', 'avg_response_days': 7.5, 'response_rate': 0.60},
    {'name': 'Thinking Machines', 'website': 'https://thinkingmachin.es', 'description': 'Data science and AI consultancy based in Manila.', 'avg_response_days': 4.5, 'response_rate': 0.80},
    {'name': 'Symph', 'website': 'https://symph.co', 'description': 'Product development studio building software for startups and enterprises.', 'avg_response_days': 9.0, 'response_rate': 0.50},
]

JOBS_DATA = [
    {'title': 'Senior Backend Engineer', 'location': 'Bonifacio Global City, Taguig', 'remote_policy': 'hybrid', 'seniority': 'senior', 'salary_min': 120000, 'salary_max': 180000, 'salary_band_hint': 'Top 20% for Backend roles in BGC', 'salary_verified': True, 'skills': ['Python', 'Django', 'PostgreSQL', 'Redis', 'Docker']},
    {'title': 'Full-Stack Engineer', 'location': 'Ortigas Center, Pasig', 'remote_policy': 'remote', 'seniority': 'mid', 'salary_min': 70000, 'salary_max': 110000, 'salary_band_hint': 'Above average for Full-Stack in Metro Manila', 'salary_verified': True, 'skills': ['React', 'TypeScript', 'Node.js', 'PostgreSQL']},
    {'title': 'Frontend Engineer', 'location': 'Remote, Philippines', 'remote_policy': 'remote', 'seniority': 'mid', 'salary_min': 60000, 'salary_max': 95000, 'salary_band_hint': 'Top 25% for React roles in the Philippines', 'salary_verified': False, 'skills': ['React', 'TypeScript', 'Next.js', 'Tailwind CSS']},
    {'title': 'Staff Engineer', 'location': 'Remote, Philippines', 'remote_policy': 'remote', 'seniority': 'lead', 'salary_min': 180000, 'salary_max': 280000, 'salary_band_hint': 'Top 10% across all engineering roles in PH', 'salary_verified': True, 'skills': ['Python', 'Go', 'Kubernetes', 'AWS', 'Terraform']},
    {'title': 'DevOps Engineer', 'location': 'Makati City', 'remote_policy': 'onsite', 'seniority': 'senior', 'salary_min': 100000, 'salary_max': 150000, 'salary_band_hint': 'Competitive for DevOps in Makati', 'salary_verified': True, 'skills': ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD', 'Linux']},
    {'title': 'Junior Frontend Developer', 'location': 'Cebu City', 'remote_policy': 'hybrid', 'seniority': 'junior', 'salary_min': 30000, 'salary_max': 50000, 'salary_band_hint': 'Market rate for Junior Frontend in Cebu', 'salary_verified': False, 'skills': ['JavaScript', 'React', 'Tailwind CSS']},
    {'title': 'Backend Engineer (Go)', 'location': 'Remote, Philippines', 'remote_policy': 'remote', 'seniority': 'senior', 'salary_min': 130000, 'salary_max': 190000, 'salary_band_hint': 'Top 15% for Go engineers in Southeast Asia', 'salary_verified': True, 'skills': ['Go', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes']},
    {'title': 'Data Engineer', 'location': 'Quezon City', 'remote_policy': 'hybrid', 'seniority': 'mid', 'salary_min': 75000, 'salary_max': 120000, 'salary_band_hint': 'Above median for Data engineers in Metro Manila', 'salary_verified': True, 'skills': ['Python', 'PostgreSQL', 'Elasticsearch', 'AWS']},
    {'title': 'Principal Engineer', 'location': 'Remote, Philippines', 'remote_policy': 'remote', 'seniority': 'principal', 'salary_min': 220000, 'salary_max': 350000, 'salary_band_hint': 'Top 5% for Principal engineers in the Philippines', 'salary_verified': True, 'skills': ['Python', 'Go', 'Rust', 'Kubernetes', 'AWS', 'GCP']},
    {'title': 'React Native Engineer', 'location': 'Davao City', 'remote_policy': 'hybrid', 'seniority': 'mid', 'salary_min': 65000, 'salary_max': 100000, 'salary_band_hint': 'Competitive for Mobile developers in Davao', 'salary_verified': False, 'skills': ['JavaScript', 'TypeScript', 'React']},
    {'title': 'GraphQL API Engineer', 'location': 'Bonifacio Global City, Taguig', 'remote_policy': 'remote', 'seniority': 'senior', 'salary_min': 110000, 'salary_max': 160000, 'salary_band_hint': 'Top 20% for API engineers in BGC', 'salary_verified': True, 'skills': ['GraphQL', 'Node.js', 'TypeScript', 'PostgreSQL']},
    {'title': 'Intern Software Engineer', 'location': 'Makati City', 'remote_policy': 'onsite', 'seniority': 'intern', 'salary_min': 15000, 'salary_max': 25000, 'salary_band_hint': 'Top 30% for internships in Metro Manila', 'salary_verified': True, 'skills': ['Python', 'JavaScript', 'React']},
]

SALARY_SUBMISSIONS = [
    {'role': 'Backend Engineer', 'location': 'Bonifacio Global City, Taguig', 'seniority': 'senior', 'amount': 150000},
    {'role': 'Backend Engineer', 'location': 'Bonifacio Global City, Taguig', 'seniority': 'senior', 'amount': 165000},
    {'role': 'Backend Engineer', 'location': 'Bonifacio Global City, Taguig', 'seniority': 'mid', 'amount': 95000},
    {'role': 'Frontend Engineer', 'location': 'Remote, Philippines', 'seniority': 'mid', 'amount': 80000},
    {'role': 'Frontend Engineer', 'location': 'Remote, Philippines', 'seniority': 'mid', 'amount': 75000},
    {'role': 'Frontend Engineer', 'location': 'Remote, Philippines', 'seniority': 'junior', 'amount': 40000},
    {'role': 'DevOps Engineer', 'location': 'Makati City', 'seniority': 'senior', 'amount': 135000},
    {'role': 'DevOps Engineer', 'location': 'Makati City', 'seniority': 'mid', 'amount': 90000},
    {'role': 'Full-Stack Engineer', 'location': 'Ortigas Center, Pasig', 'seniority': 'mid', 'amount': 88000},
    {'role': 'Full-Stack Engineer', 'location': 'Ortigas Center, Pasig', 'seniority': 'senior', 'amount': 140000},
]


class Command(BaseCommand):
    help = 'Seed the database with realistic demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding skills...')
        skills = {}
        for name in SKILLS_DATA:
            skill, _ = Skill.objects.get_or_create(name=name, defaults={'slug': slugify(name)})
            skills[name] = skill

        self.stdout.write('Seeding companies...')
        companies = []
        for data in COMPANIES_DATA:
            company, _ = Company.objects.get_or_create(
                slug=slugify(data['name']),
                defaults={**data, 'slug': slugify(data['name'])},
            )
            companies.append(company)

        self.stdout.write('Seeding jobs...')
        for i, data in enumerate(JOBS_DATA):
            company = companies[i % len(companies)]
            job_skills = [skills[s] for s in data.pop('skills') if s in skills]
            job, created = Job.objects.get_or_create(
                title=data['title'],
                company=company,
                defaults={**data, 'application_link': company.website, 'currency': 'PHP'},
            )
            if created:
                job.tech_stack.set(job_skills)

        self.stdout.write('Seeding salary submissions...')
        for data in SALARY_SUBMISSIONS:
            SalarySubmission.objects.get_or_create(
                role=data['role'],
                location=data['location'],
                seniority=data['seniority'],
                amount=data['amount'],
                defaults={'currency': 'PHP'},
            )

        self.stdout.write('Creating demo users...')
        if not User.objects.filter(username='free_user').exists():
            u = User.objects.create_user('free_user', 'free@devboard.io', 'password123')
            Profile.objects.create(user=u, tier='free', headline='Frontend Dev', years_experience=2)

        if not User.objects.filter(username='premium_user').exists():
            u = User.objects.create_user('premium_user', 'premium@devboard.io', 'password123')
            p = Profile.objects.create(user=u, tier='premium', headline='Senior Backend Dev', years_experience=7)
            p.skills.set([skills['Python'], skills['Django'], skills['PostgreSQL'], skills['Docker']])

        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@devboard.io', 'admin123')
            self.stdout.write('  Created superuser: admin / admin123')

        self.stdout.write(self.style.SUCCESS('Seed complete!'))
