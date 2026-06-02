# DevBoard — Freemium Tech Job Board

A full-stack job board platform built with **Django REST Framework** and **React**, featuring JWT authentication, role-based access control, salary transparency controls, company management, applicant tracking, and salary benchmarking.

## Live Deployment

### Frontend

https://devboard-bay.vercel.app

### Backend API

https://devboard-backend-j0tt.onrender.com

### Admin Panel

https://devboard-backend-j0tt.onrender.com/admin/

---

# Technology Stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Frontend       | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend        | Django, Django REST Framework                           |
| Authentication | JWT (SimpleJWT)                                         |
| Database       | PostgreSQL (Render)                                     |
| Deployment     | Vercel (Frontend), Render (Backend)                     |
| Testing        | Pytest, pytest-django                                   |
| API Client     | Axios                                                   |

---

# Features

## User Features

* User Registration
* JWT Authentication
* Profile Management
* Skill Management
* Job Search
* Job Applications
* Saved Searches
* Salary Benchmarking
* Notifications

## Company Features

* Company Registration
* Company Verification
* Company Dashboard
* Job Posting
* Application Review
* Candidate Rating

## Premium Features

* Direct Application Links
* Salary Visibility
* Salary Analytics
* Premium Account Upgrade

---

# Security Features

* JWT Authentication
* JWT Refresh Tokens
* Field-Level Salary Masking
* Honeypot Bot Protection
* Registration Time-Trap Protection
* Rate Limiting / Throttling
* Security Headers
* Role-Based Access Control
* CORS Protection
* PostgreSQL Database Security

---

# Installation

## Backend Setup

```bash
pip install -r requirements.txt

python manage.py migrate

python manage.py seed

python manage.py runserver
```

Backend URL:

```text
http://127.0.0.1:8000
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

# Environment Variables

## Backend

```env
DJANGO_SECRET_KEY=your-secret-key

DJANGO_DEBUG=False

DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com

CORS_ALLOWED_ORIGINS=http://localhost:5173,https://devboard-bay.vercel.app
```

---

# API Endpoints

## Authentication

```http
POST /api/auth/register/
POST /api/auth/token/
POST /api/auth/token/refresh/
GET  /api/auth/me/
PATCH /api/auth/me/
POST /api/auth/upgrade/
```

## Jobs

```http
GET  /api/jobs/
GET  /api/jobs/{id}/
POST /api/jobs/create/
```

## Applications

```http
GET    /api/jobs/applications/
POST   /api/jobs/applications/
PATCH  /api/jobs/applications/{id}/
DELETE /api/jobs/applications/{id}/
```

## Companies

```http
POST /api/companies/register/
POST /api/companies/verify-otp/
GET  /api/companies/me/
PATCH /api/companies/me/
```

---

# Testing

```bash
python -m pytest tests/ -v
```

---

# Security Audit Summary

### Authentication

* JWT Authentication Implemented
* Refresh Tokens Enabled
* Tier-based Access Control

### Input Validation

* Honeypot Fields
* Registration Time-Trap
* Server-side Validation

### Application Security

* CORS Restrictions
* Security Headers
* XSS Protection
* Clickjacking Protection
* HTTPS Deployment

### Database Security

* PostgreSQL Hosted on Render
* Environment Variable Configuration
* Secrets Removed from Source Code

---

# Authors

DevBoard Development Team

Academic Project Submission
