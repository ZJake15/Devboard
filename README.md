# DevBoard — Freemium Tech Job Board

A full-stack tech job board with **field-level salary masking** gated by JWT tier claims.

## Stack

| Layer | Tech |
|---|---|
| Backend | Django 6, DRF, SimpleJWT, django-filter, SQLite |
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query |
| Auth | JWT with custom `tier` claim (`free` / `premium`) |
| Tests | pytest + pytest-django (31 tests) |

---

## Quick Start

### Backend

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Apply migrations
python manage.py migrate

# 3. Seed demo data (jobs, companies, skills, users)
python manage.py seed

# 4. Start dev server
python manage.py runserver
```

**Demo accounts created by seed:**

| Username | Password | Tier |
|---|---|---|
| `free_user` | `password123` | Free |
| `premium_user` | `password123` | Premium |
| `admin` | `admin123` | Superuser |

Admin panel: http://127.0.0.1:8000/admin/

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | insecure dev key | Set a strong secret in production |
| `DJANGO_DEBUG` | `True` | Set `False` for production |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Frontend origin(s) |

---

## API Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | None | Register (honeypot + time-trap) |
| POST | `/api/auth/token/` | None | Login → JWT with `tier` claim |
| POST | `/api/auth/token/refresh/` | None | Refresh access token |
| GET | `/api/auth/me/` | Bearer | Current user + profile |
| PATCH | `/api/auth/me/` | Bearer | Update profile / skills |
| POST | `/api/auth/upgrade/` | Bearer | Demo: upgrade to premium |
| GET | `/api/auth/skills/` | None | All skills |
| GET | `/api/jobs/` | None | Job list (filtered + paginated) |
| GET | `/api/jobs/:id/` | None | Job detail |
| GET | `/api/jobs/salary/benchmark/` | None | Crowd salary aggregates |
| POST | `/api/jobs/salary/submit/` | None | Submit anonymous salary |
| GET/POST | `/api/jobs/saved-searches/` | Bearer | Saved searches |
| GET/PATCH/DELETE | `/api/jobs/applications/:id/` | Bearer | Update/delete application |
| GET | `/api/companies/` | None | Companies |

### Job list query params

`search`, `location`, `remote_policy` (multi), `seniority` (multi), `tech_stack` (multi slug), `salary_min`, `salary_verified`, `page`

---

## Core Feature: Field-Level Masking

The JWT carries a `tier` claim. The `JobSerializer` reads `request.auth.get("tier")` — **no extra DB hit** — and returns:

**Free / anonymous:**
```json
{
  "salary_range": { "masked": true, "hint": "Top 25% for React roles in Berlin", "message": "Upgrade to reveal..." },
  "application_link": { "masked": true, "message": "Premium members apply directly" }
}
```

**Premium:**
```json
{
  "salary_range": { "masked": false, "min": 120000, "max": 160000, "currency": "USD" },
  "application_link": { "masked": false, "url": "https://acme.com/apply" }
}
```

Real values are **never sent** to free/anonymous clients — not even hidden in the payload.

---

## Security Features

- **Honeypot fields** (`website`, `nickname`) on registration — server rejects non-empty submissions
- **Time-trap** — rejects registration submitted in under 2 seconds
- **DRF throttling** — 10/min on auth, 5/min on salary submissions, 60/min anon, 120/min user
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS (production)
- **JWT rotation** — refresh tokens rotate on use

---

## Running Tests

```bash
python -m pytest tests/ -v
```

Test coverage:
- `test_masking.py` — salary + link masking for anon/free/premium, regression (no real values in body)
- `test_auth.py` — honeypot, time-trap, JWT tier claim
- `test_filters.py` — search, remote_policy, seniority, tech_stack, pagination link preservation
- `test_salary_benchmark.py` — aggregates, anonymization, 404 on no data

---

## Security Audit

```bash
bash scripts/audit.sh
```

Runs bandit (SAST), pip-audit (CVE check), and the full test suite.
