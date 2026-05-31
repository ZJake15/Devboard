# How to Run DevBoard

## Prerequisites

Make sure you have these installed on your machine:

- **Python 3.12+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Git** — [git-scm.com](https://git-scm.com/)

---

## Step 1 — Clone the project

```bash
git clone <repository-url>
cd Finals
```

---

## Step 2 — Set up the Backend (Django)

Open a terminal in the project root folder (`Finals/`).

### Activate the virtual environment

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
.venv\Scripts\activate.bat
```

**Mac / Linux:**
```bash
source .venv/bin/activate
```

### Install Python dependencies

```bash
pip install -r requirements.txt
```

### Apply database migrations

```bash
python manage.py migrate
```

### Seed demo data (jobs, companies, users)

```bash
python manage.py seed
```

> This creates sample jobs, companies, skills, and the demo accounts listed below. Only needs to be run once.

### Start the Django server

```bash
python manage.py runserver
```

The API will be running at **http://127.0.0.1:8000**

---

## Step 3 — Set up the Frontend (React)

Open a **second terminal** in the `frontend/` folder.

```bash
cd frontend
npm install
npm run dev
```

The website will be running at **http://localhost:5173**

---

## Step 4 — Open the website

Go to **http://localhost:5173** in your browser.

> Both terminals must be running at the same time — Django in one, React in the other.

---

## Demo Accounts

| Username | Password | Access Level |
|---|---|---|
| `free_user` | `password123` | Free tier — salary is blurred |
| `premium_user` | `password123` | Premium — full salary + pipeline |
| `admin` | `admin123` | Django admin panel |

**Django Admin Panel:** http://127.0.0.1:8000/admin/

---

## Quick Reference — Commands to Run Every Time

```
Terminal 1 (Backend)          Terminal 2 (Frontend)
──────────────────────        ──────────────────────
cd Finals                     cd Finals/frontend
.venv\Scripts\Activate.ps1    npm run dev
python manage.py runserver
```

---

## Troubleshooting

**"No module named 'rest_framework'"**
> The virtual environment is not activated, or packages are missing.
> Run `.\.venv\Scripts\Activate.ps1` then `pip install -r requirements.txt`.

**"npm: command not found"**
> Node.js is not installed. Download it from [nodejs.org](https://nodejs.org/).

**Frontend shows blank page / can't connect to API**
> Make sure the Django server (Terminal 1) is also running.

**Port already in use**
> Another process is using port 8000 or 5173. Either stop it, or run Django on a different port: `python manage.py runserver 8001`
