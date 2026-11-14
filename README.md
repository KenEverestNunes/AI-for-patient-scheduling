# CareSync Health — AI Patient Intake & Voice Receptionist

An intelligent, multi-channel patient intake, scheduling, and voice receptionist platform powered by **Groq (Llama 3.3 70B)** and **Vapi Telephony**.

---

## 🏗️ Architecture & Stack

* **Frontend**: React 19, Vite, Tailwind CSS v4
* **Backend**: Node.js, Express 5, CORS, Dotenv
* **Intelligence**: Groq SDK (`llama-3.3-70b-versatile`) with native tool calling
* **Voice Telephony**: Vapi (Bidirectional phone calls with dynamic webhook tool execution)
* **Email**: SendGrid API for HTML appointment confirmations
* **Persistence**: Migrating from in-memory / flat JSON (`db.json`) to **Neon Serverless PostgreSQL**
* **Deployment Target**: Vercel (Frontend & Serverless API) + Neon (Database)

---

## 📁 Repository Structure

```text
├── client/                     # React 19 frontend
│   ├── public/                 # Static assets & icons
│   ├── src/                    # Components (LandingPage, IntakeForm, ChatInterface)
│   ├── index.html              # Entry HTML
│   └── vite.config.js          # Vite config with API proxy
├── server/                     # Node.js backend
│   ├── data/                   # Data store & schema
│   ├── routes/                 # Express API routes (intake, chat, appointments, voice)
│   ├── services/               # Integrations (groq.js, email.js)
│   ├── index.js                # API entry point & CORS configuration
│   └── .env.example            # Environment template
├── ISSUES.md                   # Complete architectural audit & GitHub issue tracker
└── README.md                   # This file
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
* Node.js 20+ installed
* Git & GitHub CLI (`gh`)

### 2. Setup Backend
```bash
cd server
cp .env.example .env
# Fill in your GROQ_API_KEY, VAPI_API_KEY, SENDGRID_API_KEY, etc.
npm install
npm run dev
```

### 3. Setup Frontend
```bash
cd ../client
npm install
npm run dev
```
The application will launch at `http://localhost:5173`.

---

## 🤖 GitHub CLI (`gh`) Automation Guide

This repository utilizes GitHub CLI (`gh`) to programmatically manage issues, pull requests, and releases without manual web browser navigation.

### 1. Environment & Path (Windows)
GitHub CLI is located at:
```text
C:\Program Files\GitHub CLI\gh.exe
```

In PowerShell or automated subshells, ensure `gh` is in your environment path:
```powershell
$env:Path = "C:\Program Files\GitHub CLI;" + $env:Path
```

### 2. Verify Authentication
```powershell
gh auth status
```

### 3. Core CLI Workflows

#### List Active Issues
```powershell
gh issue list
gh issue list --state all
```

#### Create a New Issue
```powershell
$body = @"
### 1. Context & Motivation
Detailed problem statement.

### 2. Proposed Solution
Implementation plan.

### 3. Acceptance Criteria
- [ ] Task 1
- [ ] Task 2
"@

gh issue create --title "[type]: Feature or bug summary" --body "$body"
```

#### Close an Issue
```powershell
gh issue close <issue-number> --reason "completed"
```

#### Create & Merge Pull Requests
```powershell
# Create PR linked to an issue
gh pr create --title "type(scope): summary" --body "Resolves #<issue-number>"

# Squash and merge PR
gh pr merge <pr-number> --squash
```

---

## 📋 Production Audit & Roadmap

For full details on the architectural audit, failure mode analysis (unhandled exceptions, memory leaks, race conditions, type confusions), and active sprint progress, see:

👉 **[`ISSUES.md`](./ISSUES.md)**
