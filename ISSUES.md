# Kyron Medical: Technical Audit, Failure Modes & Hosting Assessment

> **Status:** Critical Review & Migration In Progress  
> **Scope:** Full-Stack Architecture, Hosting Infrastructure, Telephony (Vapi), LLM Integration (Groq), Security & Data Integrity

---

## 1. Hosting Failure Analysis & Railway Trial Status

### 1.1 The AWS EC2 Failure Modes (Original Deployment)
The original hosting setup on a standalone AWS EC2 Ubuntu instance degraded and failed due to three interdependent architectural flaws:

1. **The Ephemeral Ngrok Webhook Trap**:
   * Telephony integration (Vapi) strictly requires public HTTPS webhooks for inbound calls and real-time tool execution (`/api/voice/tool`).
   * Because the EC2 instance lacked a configured domain or SSL certificate (Nginx was bound to plain HTTP on port 80), the deployment script (`git_deploy.sh`) executed an unmonitored background daemon:
     ```bash
     nohup ngrok http 3001 --log stdout > /var/log/ngrok.log 2>&1 &
     ```
   * Free-tier Ngrok tunnels enforce session time limits, rate limits, and rotate subdomains upon process or VM restarts.
   * When the background tunnel dropped, the backend fell back to an expired developer URL (`https://muzzy-braden-civilly.ngrok-free.dev`), causing all Vapi phone call handoffs and inbound webhook requests to fail permanently.

2. **Database Annihilation on Deployment (`git_deploy.sh`)**:
   * The setup script wiped and cloned the repo on every deployment:
     ```bash
     cd ~ && rm -rf AI-for-patient-scheduling
     git clone https://github.com/KenEverestNunes/AI-for-patient-scheduling.git
     ```
   * Because the database was a flat JSON file located at `server/data/db.json`, running this script completely deleted all registered patients, booked appointments, and chat sessions.

3. **Git Merge Conflicts During Updates (`update_ec2.sh`)**:
   * `server/data/db.json` was tracked in git and omitted from `.gitignore`.
   * When appointments were created, `db.json` was mutated on disk.
   * Subsequent runs of `git pull` aborted with merge conflict errors:
     ```text
     error: Your local changes to the following files would be overwritten by merge: server/data/db.json
     ```
   * With `set -e` enabled, the update script crashed midway without restarting services.

4. **EC2 Low-Memory OOM Crashes**:
   * Building the frontend (`npm run build` with Vite + Tailwind CSS v4) directly on a `t2.micro` or `t3.micro` instance (1 GB RAM) exceeded available memory, triggering the Linux OOM killer and terminating the build or PM2 backend processes.

---

### 1.2 Railway Trial Expiration & Hosting Alternatives Matrix
Because your Railway trial has expired, deploying without paying subscription costs requires choosing a reliable alternative. Below is an evaluation of viable hosting targets:

| Platform | Tier / Pricing | Voice Webhook Suitability | Verdict |
| :--- | :--- | :--- | :--- |
| **Koyeb** | Free tier (always-on, 512MB RAM, no cold sleep) + Free SSL | **Excellent**: Always on, instant HTTPS URL, zero cold start for Vapi. | **Top Free Alternative**: Drop-in container/Node deployment with persistent HTTPS. |
| **Render** | Free tier (spins down after 15 min) or $7/mo Starter | **Poor on Free, Good on Paid**: Free tier cold starts (30–50s) cause Vapi webhooks to time out. | Recommended only if on paid tier ($7/mo). |
| **Fly.io** | Generous free allowance / micro pay-per-use (~$2/mo) | **Good**: Fast edge hosting with global routing and SSL. Requires CLI or Dockerfile. | Solid choice for developers comfortable with CLI deployments. |
| **AWS Lightsail** | $3.50/mo (fixed, includes 512MB RAM, IPv4, SSD) | **Good**: Predictable pricing, but requires manual Certbot SSL setup on Nginx. | Best if staying within the AWS ecosystem without complex VPC/ALB pricing. |
| **Vercel (Frontend)** | Free Tier | **Ideal for Client**: Unlimited static builds, global CDN, zero server maintenance. | Use for `client/` React frontend regardless of backend choice. |

---

## 2. Comprehensive Code & Reliability Audit

This section documents all confirmed failure modes identified across the 5 core hazard categories.

### Category 1: Unhandled Exceptions

#### Issue 1.1: Unhandled `TypeError` in `matchDoctor` on Empty/Non-String `bodyPart`
* **File:** `server/data/store.js:136` & `server/services/groq.js:142`
* **Trigger:** Groq or Vapi executes the `searchAvailabilities` tool call with missing or null arguments (`{ bodyPart: null }` or `{}`):
  ```javascript
  function matchDoctor(reason) {
    const reasonLower = reason.toLowerCase(); // Throws TypeError if reason is null/undefined/number
  ```
* **Impact:** Immediate unhandled exception in tool handling; 500 error returned to Vapi or termination of the chat turn.
* **Remediation:** Coerce to string safely: `const reasonLower = String(reason || '').toLowerCase();`.

#### Issue 1.2: Unprotected `JSON.parse` on LLM Tool Arguments
* **File:** `server/services/groq.js:260`
* **Trigger:** LLM emits malformed or truncated JSON in `toolCall.function.arguments`.
* **Impact:** Direct unhandled `SyntaxError` throws out of the execution loop into the outer catch handler, aborting user interaction.
* **Remediation:** Wrap `JSON.parse` in a scoped `try/catch` and return an explicit validation error to the model.

#### Issue 1.3: Unhandled Non-JSON Response from Vapi Call API
* **File:** `server/routes/voice.js:92`
* **Trigger:** Vapi edge gateway returns 502/503 HTML during outages or rate-limiting.
* **Impact:** `response.json()` throws `SyntaxError: Unexpected token '<'`, masking the upstream HTTP status.
* **Remediation:** Check `response.ok` or inspect content-type before parsing JSON.

#### Issue 1.4: Template String Crash on Missing Patient Record
* **File:** `server/services/email.js:48`
* **Trigger:** Booking succeeds for a synthetic or mismatched `patientId` where `getPatient(patientId)` returns `undefined`.
* **Impact:** `patient.firstName` throws `TypeError: Cannot read properties of undefined (reading 'firstName')`.

---

### Category 2: Memory Leaks & Resource Exhaustion

#### Issue 2.1: Unbounded In-Memory Collections (`chatSessions`, `patients`, `appointments`)
* **File:** `server/data/store.js:80-84`
* **Trigger:** Ongoing web visits and message additions (`addMessage`).
* **Impact:** The `chatSessions` object and arrays grow indefinitely in process heap memory. In long-running Node.js processes, this leads to continuous heap inflation and eventual V8 heap exhaustion (`JavaScript heap out of memory`).
* **Remediation:** Implement TTL-based session eviction or migrate to an external datastore (PostgreSQL/Redis).

#### Issue 2.2: Dangling Component Timer in Voice Handoff UI
* **File:** `client/src/components/ChatInterface.jsx:110-113`
* **Trigger:** Navigating away from `ChatInterface` within 3 seconds of clicking Call.
* **Impact:** `setTimeout` callback fires on an unmounted React component, leaking memory references and emitting console errors.
* **Remediation:** Store timer ref and clear it in a `useEffect` cleanup return.

---

### Category 3: Race Conditions & Concurrency Hazards

#### Issue 3.1: Non-Atomic Synchronous File Overwrites (`saveDB`)
* **File:** `server/data/store.js:71-78`
* **Trigger:** Multiple concurrent bookings or server shutdown during `fs.writeFileSync(DB_PATH, ...)`.
* **Impact:** Synchronous truncation leaves `db.json` with 0 bytes if interrupted, permanently destroying all patient records.
* **Remediation:** Use write-to-temp-file followed by atomic file rename (`fs.renameSync`).

#### Issue 3.2: Double-Booking Due to Lack of Transactional Isolation
* **File:** `server/data/store.js:185-210`
* **Trigger:** Simultaneous requests selecting the same availability slot.
* **Impact:** In the event loop tick between slot lookup and `slot.booked = true`, concurrent requests pass the availability check, resulting in duplicate appointments.
* **Remediation:** Use transactional mutex locks or atomic database constraints (`UNIQUE(slot_id)`).

#### Issue 3.3: In-Place Mutation Hazard in `getPatientByPhone`
* **File:** `server/data/store.js:235`
* **Trigger:** Phone lookups calling `.sort(...)` directly on the global `patients` array.
* **Impact:** Mutates array order in place. If `createdAt` is missing or invalid, subtraction produces `NaN`, causing sorting destabilization and inconsistent patient lookups.

---

### Category 4: Type Confusions & Implicit Coercions

#### Issue 4.1: Object Prototype Pollution / Key Collision via `sessionId`
* **File:** `server/routes/chat.js:16` & `server/data/store.js:241`
* **Trigger:** User sends `sessionId: "__proto__"` or `sessionId: "constructor"`.
* **Impact:** `chatSessions[sessionId]` accesses the JavaScript object prototype rather than an isolated session entry, risking prototype pollution or unexpected type behaviors.

#### Issue 4.2: Phone Number Coercion Producing Invalid E.164 String
* **File:** `server/routes/voice.js:15-18`
* **Trigger:** A phone number input devoid of digits (e.g., `"N/A"` or `""`).
* **Impact:** Stripping digits leaves `""`. The check `!formattedPhone.startsWith('+')` evaluates true, producing `"+"`, which causes Vapi to reject the call with an immediate 400 Bad Request.

---

### Category 5: Missing Input Validation & Security / HIPAA Deficits

#### Issue 5.1: Missing Type Validation on Intake Body
* **File:** `server/routes/intake.js:9-24`
* **Trigger:** Sending numeric, boolean, or object values for `firstName` or `email` (e.g. `{ "firstName": 1234 }`).
* **Impact:** Calling `.trim()` or `.toLowerCase()` throws `TypeError: firstName.trim is not a function`, crashing the route handler with an unhandled 500 error.

#### Issue 5.2: Unauthenticated Patient Data Endpoints (HIPAA Violation)
* **File:** `server/routes/appointments.js:6` & `server/routes/chat.js:43`
* **Trigger:** Direct GET request to `/api/appointments/:patientId` or `/api/chat/:sessionId`.
* **Impact:** Exposes full Protected Health Information (PHI)—names, dates of birth, symptoms, doctor details, and chat transcripts—without authentication, session tokens, or rate-limiting.

#### Issue 5.3: Unverified Webhook Signature on Voice Tool Execution
* **File:** `server/routes/voice.js:180-231`
* **Trigger:** Public HTTP POST to `/api/voice/tool`.
* **Impact:** Allows arbitrary parties to book appointments, trigger confirmation emails, or alter doctor availability by sending mock Vapi payloads without signature verification.

---

## 3. Completed Fixes Summary

The following immediate fixes have already been implemented in the active workspace:

1. **Ngrok Completely Eradicated**:
   * Removed daemon invocation, CLI scripts, and local tunnel polling (`127.0.0.1:4040`).
   * Replaced with centralized URL resolution in `server/routes/voice.js` utilizing `BACKEND_URL` / `VAPI_WEBHOOK_URL` and `req.headers.host`.
2. **Fixed Voice Call Handoff Message Bug**:
   * Updated `server/routes/voice.js` to return a complete confirmation payload with a `message` property.
   * Updated `client/src/components/ChatInterface.jsx` with fallbacks to eliminate `📞 undefined`.
3. **Persona Consistency**:
   * Unified the assistant identity to **"Kyra"** across client UI, Groq system prompts, and Vapi voice greetings.
4. **Environment Configuration**:
   * Updated `server/.env.example` with all active keys (`GROQ_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `BACKEND_URL`, `SENDGRID_SENDER_EMAIL`).
5. **CORS Flexibility**:
   * Configured `server/index.js` to dynamically allow local development, custom production domains, and `*.vercel.app` preview environments.
6. **Git Conflict Prevention**:
   * Added `server/data/db.json` and local environments to `.gitignore`.

---

## 4. GitHub Issues Tracker & Migration Roadmap

> **Target Architecture:** Vercel (Frontend & Serverless API) + Neon (Serverless PostgreSQL)  
> **Repository:** `KenEverestNunes/AI-for-patient-scheduling`

### Issue Tracking Queue (Synced with GitHub)

| GitHub # | Issue Title | Priority | Labels | Current Status |
| :---: | :--- | :--- | :--- | :--- |
| **[#1](https://github.com/KenEverestNunes/AI-for-patient-scheduling/issues/1)** | `[bug]: Fix unhandled TypeError in matchDoctor during searchAvailabilities tool calls` | **P0 (Critical)** | `bug`, `backend`, `voice` | 🟣 **Resolved & Closed** (Merged in PR #2) |
| **[#3](https://github.com/KenEverestNunes/AI-for-patient-scheduling/issues/3)** | `[migration]: Replace in-memory db.json with Neon Serverless PostgreSQL schema` | **P0 (Critical)** | `enhancement`, `database`, `migration` | 🟢 **Open** (Up Next) |
| **[#4](https://github.com/KenEverestNunes/AI-for-patient-scheduling/issues/4)** | `[security]: Implement authentication and rate-limiting on patient data routes` | **P1 (High)** | `security`, `hipaa`, `backend` | 🟢 **Open** |
| **[#5](https://github.com/KenEverestNunes/AI-for-patient-scheduling/issues/5)** | `[security]: Verify Vapi webhook signature/secret on /api/voice/tool` | **P1 (High)** | `security`, `voice`, `backend` | 🟢 **Open** |
| **[#6](https://github.com/KenEverestNunes/AI-for-patient-scheduling/issues/6)** | `[bug]: Add schema validation for /api/intake registration payloads` | **P2 (Medium)** | `bug`, `validation` | 🟢 **Open** |
| **[#7](https://github.com/KenEverestNunes/AI-for-patient-scheduling/issues/7)** | `[bug]: Fix React component unmount memory leak in ChatInterface voice handoff` | **P2 (Medium)** | `bug`, `frontend`, `performance` | 🟣 **Fixed in `fix/react-unmount-timer-leak`** (Resolves #7) |
| **[#9](https://github.com/KenEverestNunes/AI-for-patient-scheduling/issues/9)** | `[infra]: Configure Vercel deployment and rewrites for React frontend` | **P1 (High)** | `enhancement`, `frontend`, `migration` | 🟢 **Open** |

---
