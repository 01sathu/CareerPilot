# CareerPilot — AI-Powered Job Search & Career Management Platform

[![Status](https://img.shields.io/badge/Status-Phase%208%20Completed-emerald.svg)](#)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Express%20%7C%20MongoDB%20%7C%20Tailwind-green.svg)](#)
[![Tests](https://img.shields.io/badge/Tests-106%20Passing-brightgreen.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](#)

> CareerPilot is a production-style full-stack career platform designed to help job seekers track applications, analyze resumes with structured AI feedback, practice mock interviews, visualize career momentum through factual analytics, and own their data through secure exports and complete account deletion.

---

## 1. System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React SPA)                      │
│   Vite + Tailwind CSS + TanStack Query + React Hook Form    │
│    dnd-kit (Kanban) + Recharts (Analytics) + Resume Views   │
│       Calendar (Month/Week/Agenda) + Notifications Bell     │
│       AI Interview Prep (Practice & Mock Runner)            │
│       Settings (Profile, Account, Notifs, Export, Danger)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST (/api/v1)
                               │ (Access Token in Memory + HttpOnly Cookie)
┌──────────────────────────────▼──────────────────────────────┐
│                    BACKEND (Node.js/Express)                │
│   • Middleware (Auth, MongoSanitize, Zod, Rate Limit)       │
│   • Controllers (Thin HTTP Request/Response)                │
│   • Services (Auth, Token, Application, Analytics, AI)      │
│   • Services (Interview, Notification, InterviewSession)    │
│   • Storage Service (Out-of-webroot PDF & S3/R2 Adapter)    │
│   • CSV Service (RFC 4180, UTF-8 BOM, Formula Defense)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE (MongoDB Atlas)                │
│   Users, Applications, Resumes, Interviews,                 │
│   InterviewSessions, Notifications, ApplicationHistory      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend
- **Framework**: React.js 18 (Vite 6)
- **Styling**: Tailwind CSS
- **Code Splitting**: Dynamic `React.lazy()` chunking with `<Suspense />` (0 chunks over 500 kB)
- **Data Visualization**: Recharts (Volume trends, status distributions, conversion funnels)
- **Pipeline Board**: `@dnd-kit/core` Drag-and-Drop Kanban with optimistic UI & rollback
- **Resume UI**: Multi-view PDF analyzer, score breakdown meters, matched/missing skills tags, and AI consent modal
- **Interview Preparation**: Practice Q&A workspace with sample answers and on-demand feedback; Mock interview runner with timer and completion analytics
- **Interview Calendar**: Multi-view calendar (Month grid, 7-day hourly timetable, chronological agenda list), conflict warning banner, RFC 5545 `.ics` export
- **In-App Notifications**: Header bell with live unread badge, 60s background polling + window focus refresh, filter tabs, and mark all read
- **Settings & Privacy**: 5-tab settings area (Profile, Account, Notifications, Data Export, Danger Zone) and public Privacy Notice (`/privacy`)
- **Routing**: React Router v6 (Protected & Guest Route Guards)
- **State & Session**: AuthContext with silent token refresh interceptor
- **Client Validation**: Zod matching backend validation rules
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (Modular Monolith)
- **Web Framework**: Express.js
- **Database / ODM**: MongoDB Atlas / Mongoose
- **Scheduler Engine**: Background reminder scheduler (5-minute tick for interview offsets & 09:00 timezone follow-up dates)
- **AI Integration**: Google Gemini API (`@google/genai`) with prompt injection defense and Zod schema enforcement
- **PDF Ingestion**: `pdf-parse`, magic byte validation (`%PDF-`), page counting, text extraction
- **Data Export & Security**: RFC 4180 CSV generation, UTF-8 BOM, Spreadsheet Formula Injection defense, MongoDB operator injection sanitization
- **Storage Adapter**: Local private disk driver with Amazon S3 / Cloudflare R2 cloud storage driver
- **Authentication**: JWT access token (15m, in memory) + Rotating refresh token in `HttpOnly` cookie (7d)
- **Password Hashing**: bcryptjs ($\ge 12$ salt rounds)
- **Validation**: Zod request schema validation
- **Security**: Helmet, CORS allowlist, Express Rate Limit, HMAC-SHA256 signed download tokens, Correlation ID (`X-Request-Id`)

---

## 3. Implemented API Endpoints (Phases 0–8)

### System Health
- `GET /api/v1/health` — Public diagnostic check (database status, uptime, service version)

### Authentication & Users (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/register` — Create account, issue access token and set refresh cookie
- `POST /api/v1/auth/login` — Authenticate by email/password (rate-limited: 5 fails / 15 min)
- `POST /api/v1/auth/refresh` — Rotate refresh token cookie and issue new access token (reuse detection)
- `POST /api/v1/auth/logout` — Revoke refresh token and clear cookie
- `POST /api/v1/auth/forgot-password` — Initiate password reset (console token in dev, email in prod)
- `POST /api/v1/auth/reset-password` — Reset password using single-use hashed token
- `POST /api/v1/auth/change-password` — Authenticated password change (revokes other sessions)
- `GET /api/v1/users/me` — Protected user profile query
- `PATCH /api/v1/users/me` — Protected profile update (skills, headline, timezone, target roles, notification preferences)
- `DELETE /api/v1/users/me` — Permanently delete user account with password & 'DELETE' confirmation; cascades erasure across all 7 collections and stored files (FR-121, FR-122, FR-123)
- `POST /api/v1/users/ai-consent` — Record explicit user AI data processing consent (FR-063)

### Job Applications & CSV Export (`/api/v1/applications`)
- `POST /api/v1/applications` — Create a new job application (auto-stamps appliedDate, logs history)
- `GET /api/v1/applications` — List applications with pagination, search, status/location filtering, and sorting
- `GET /api/v1/applications/export/csv` — Export applications to RFC 4180 CSV with formula injection defense and UTF-8 BOM (FR-117, FR-119, FR-120)
- `GET /api/v1/applications/export/history-csv` — Export application status transition history to RFC 4180 CSV (FR-118, FR-119)
- `GET /api/v1/applications/:id` — View application details with chronological status history timeline
- `PATCH /api/v1/applications/:id` — Update application details or status (logs `status_changed` history, triggers notification)
- `DELETE /api/v1/applications/:id` — Delete application and cascade delete all its history, interviews, and notifications

### Career Analytics (`/api/v1/analytics`)
- `GET /api/v1/analytics/overview` — Protected analytics overview:
  - Total application counts and counts per status (`wishlist`, `applied`, `assessment`, `interview`, `offer`, `rejected`)
  - Active pipeline count (`applied` + `assessment` + `interview`)
  - Historical conversion rates derived from `ApplicationHistory` (Applied $\to$ Interview, Interview $\to$ Offer, Overall Offer Rate) with safe zero-denominator handling (`null`) and raw count visibility
  - Weekly (12 weeks, Monday start) and monthly (12 months) application volume trends bucketed in user's timezone, guaranteed zero-filled
  - Deterministic career progress summary statements

### AI Resume Analyzer (`/api/v1/resumes`)
- `POST /api/v1/resumes` — Upload single PDF resume (max 5 MB, max 10 pages, %PDF- verification)
- `GET /api/v1/resumes` — List user's resumes (metadata only, up to 10 stored per user)
- `GET /api/v1/resumes/:id` — View resume details with extracted text and analysis history
- `GET /api/v1/resumes/:id/download-token` — Generate 5-minute HMAC-signed PDF download URL
- `GET /api/v1/resumes/download/:token` — Securely stream original PDF file using valid signed token
- `DELETE /api/v1/resumes/:id` — Cascade delete resume, stored PDF file, and all associated analyses
- `POST /api/v1/resumes/:id/analyze` — Run general structural AI analysis (categorized skills, experience, education, feedback)
- `POST /api/v1/resumes/:id/match` — Run AI job match analysis (0–100 score, component rationales, matched/missing skills, 3–10 suggestions, non-predictive disclaimer)
- `DELETE /api/v1/resumes/:id/analyses/:analysisId` — Delete specific analysis record (history capped at 20)

### Interview Calendar (`/api/v1/interviews`)
- `POST /api/v1/interviews` — Create interview event (detects overlapping conflicts, validates `endAt > startAt`)
- `GET /api/v1/interviews` — List interviews with date range filters (`startDate`, `endDate`, `status`, `applicationId`)
- `GET /api/v1/interviews/upcoming` — List upcoming interviews scheduled within next 30 days
- `GET /api/v1/interviews/:id` — Get single interview event details
- `PATCH /api/v1/interviews/:id` — Update or reschedule interview (preserves duration, clears sent reminders)
- `DELETE /api/v1/interviews/:id` — Delete interview event
- `GET /api/v1/interviews/:id/ics` — Export interview as RFC 5545 `.ics` iCalendar file

### In-App Notifications (`/api/v1/notifications`)
- `GET /api/v1/notifications` — Get paginated notifications (optional filter `isRead`)
- `GET /api/v1/notifications/unread-count` — Get unread notification count badge
- `PATCH /api/v1/notifications/:id/read` — Mark notification as read
- `PATCH /api/v1/notifications/:id/unread` — Mark notification as unread
- `POST /api/v1/notifications/mark-all-read` — Mark all notifications as read
- `DELETE /api/v1/notifications/:id` — Delete single notification

### AI Interview Preparation (`/api/v1/interview-sessions`)
- `POST /api/v1/interview-sessions` — Generate interview questions and create preparation session (rate limited: 20/hr; requires AI consent)
- `GET /api/v1/interview-sessions` — List user's interview sessions with pagination, question counts, and mode filter
- `GET /api/v1/interview-sessions/:id` — View full session details with questions, answers, and feedback
- `PATCH /api/v1/interview-sessions/:id/questions/:questionId/answer` — Save draft answer, mark as skipped, or bookmark for revisit
- `POST /api/v1/interview-sessions/:id/questions/:questionId/example-answer` — Generate or retrieve reference sample answer
- `POST /api/v1/interview-sessions/:id/questions/:questionId/feedback` — Request AI evaluation and 1–5 scoring (requires ≥20 chars)
- `POST /api/v1/interview-sessions/:id/complete` — Complete session and calculate performance review summary
- `DELETE /api/v1/interview-sessions/:id` — Delete preparation session

---

## 4. Deployment Configurations

### Frontend Deployment (Vercel)
- `frontend/vercel.json` provides SPA routing rewrites to `/index.html` and sets production security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`).
- Connect Git repository to Vercel, set Root Directory to `frontend`, Build Command to `npm run build`, and Output Directory to `dist`.
- Set Environment Variable: `VITE_API_BASE_URL=https://your-api-domain.com/api/v1`.

### Backend Deployment (Render / Docker / Railway)
- **Render**: `backend/render.yaml` defines a web service blueprint connected to Node 20 LTS, running `node server.js` with health checks on `/api/v1/health`.
- **Docker**: `backend/Dockerfile` builds an optimized, multi-stage Alpine container image executing under an unprivileged `node` user with `dumb-init`.
- **PaaS (Heroku/Railway)**: `backend/Procfile` defines `web: node server.js`.

---

## 5. Getting Started Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MONGODB_URI, JWT secrets, and GEMINI_API_KEY
npm run dev
```
Backend runs on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`. Open in your browser.

### 3. Running Automated Tests
```bash
cd backend
npm test
```
All 106 integration tests across 9 test suites will execute against your MongoDB database.

To test the live Gemini API integration directly:
```bash
cd backend
npm run test:gemini
```

---

## 6. Development Roadmap & Status
- [x] **Phase 0**: Project Scaffolding, DB Connection, Error Handling & Health API
- [x] **Phase 1**: Authentication & User Management (Module A, dual-token security, profile)
- [x] **Phase 2**: Job Application Tracker Table & History (Module B, CRUD, timeline, search & filter)
- [x] **Phase 3**: Career Analytics Dashboard (Module E, Recharts, funnels, trends & progress summaries)
- [x] **Phase 4**: Application Kanban Board (Module B, @dnd-kit drag-and-drop, optimistic UI with rollback)
- [x] **Phase 5**: Resume Upload & AI Analysis (Module C, Gemini API, PDF text extraction & matching)
- [x] **Phase 6**: Interview Calendar & Notifications (Modules F & G, Month/Week/Agenda views, conflict detection, .ics export & notification engine)
- [x] **Phase 7**: AI Interview Preparation (Module D, Practice & Mock modes, sample answers, 1-5 feedback rubrics, code-splitting)
- [x] **Phase 8**: Data Management, Security Hardening and Deployment (Module H, CSV export, formula injection defense, cascading deletion, deployment manifests)
