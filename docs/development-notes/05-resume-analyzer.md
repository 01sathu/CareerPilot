# Module C — AI Resume Analyzer

## 1. Overview & Architectural Scope
The AI Resume Analyzer (**Module C**, requirements **FR-046 through FR-067**, and acceptance criteria **AC-C-01 through AC-C-09**) enables candidates to upload, manage, and analyze PDF resumes. It integrates securely with Google Gemini LLMs to parse skills, summarize professional experience, evaluate document formatting, and calculate multi-dimensional alignment scores against target job postings.

---

## 2. Key Features & SRS Requirements Mapping

### 2.1 PDF Resume Ingestion & Validation (FR-046 – FR-050)
- **File Constraints**: Accepts only PDF documents up to 5 MB (FR-046).
- **Magic Byte Verification**: Inspects actual `%PDF-` file signature bytes (`0x25, 0x50, 0x44, 0x46, 0x2D`) to block masquerading binary/executable files (FR-047).
- **Page Limit**: Restricts documents to a maximum of 10 pages using `pdf-parse` (FR-047).
- **Encrypted/Password-Protected PDFs**: Safely caught and rejected with HTTP 400 `PDF_ENCRYPTED` (FR-048).
- **Text Extraction**: Extracts selectable text up to 50,000 characters. If extracted text is under 100 characters, `extractionStatus` is marked `failed` to flag scanned/image-only PDFs (FR-049).
- **Resume Quota**: Enforces a strict limit of 10 stored resumes per user account. An 11th upload attempt returns HTTP 409 `RESUME_LIMIT_REACHED` (FR-050).

### 2.2 Secure Storage & Temporary Signed Downloads (FR-051 – FR-053)
- **Local Storage**: Files are stored out-of-webroot under `uploads/resumes/:userId/:uuid.pdf`.
- **Signed Download URLs (FR-052)**: Generates HMAC-SHA256 signed download tokens valid for 5 minutes (`expiresAt`). Direct file paths are never exposed. Tampered tokens return HTTP 403 `INVALID_DOWNLOAD_TOKEN`.
- **Cascade Deletion (FR-053)**: Deleting a resume record automatically removes the physical file from disk and all associated AI analysis records.

### 2.3 General AI Resume Analysis (FR-054)
- **Skill Categorization**: Extracts and classifies skills into `technical`, `tools`, and `soft`.
- **Experience Timeline**: Builds structured role, organization, duration, and bullet summary entries.
- **Estimated Experience**: Estimates total years of experience, clearly tagged as an estimate.
- **Education & Structure Feedback**: Identifies degrees, institutions, strengths, improvements, and formatting notes.

### 2.4 Job Match Analysis & Scoring (FR-055 – FR-058)
- **Dual Matching Input**: Compares against an existing tracked job application (`applicationId`) or pasted job description text (50–10,000 characters).
- **Multi-Component Scoring (FR-056, FR-057)**:
  - Overall match score (0–100).
  - Component scores (0–100) with written rationales for:
    - `skills`
    - `experience`
    - `education`
    - `keywords`
  - Explicit matched skills list and categorized missing skills (`required` vs `preferred`).
- **Prioritized Improvement Suggestions (FR-058)**: Generates 3–10 actionable, prioritized recommendations.
- **Mandatory Non-Predictive Disclaimer (FR-057)**: Prominently displayed across all match views, acknowledging that scores are subjective AI estimates and do not guarantee interview or hiring outcomes.

### 2.5 Security, Safety & Governance (FR-059 – FR-067)
- **Backend-Only Gemini Integration (FR-059)**: Gemini API key (`GEMINI_API_KEY`) is kept strictly server-side and never exposed to client bundles.
- **Strict Output Schema Validation (FR-060)**: All LLM outputs are validated against Zod schemas. If the model generates invalid JSON, the service executes a single retry with error feedback before returning HTTP 502 `AI_PARSING_FAILED`.
- **Usage Rate Limiting (FR-061, FR-064)**: Per-user sliding-window rate limits of **10 analyses/hour** and **30 analyses/day**. Quota exhausted requests return HTTP 429 `RATE_LIMIT_EXCEEDED` with a `Retry-After` header. Failed/errored analyses do not consume quota (FR-061).
- **Analysis History Capping (FR-062)**: Resumes store up to 20 most recent analyses. Users can delete individual analyses via `DELETE /api/v1/resumes/:id/analyses/:analysisId`.
- **Mandatory AI Consent (FR-063)**: Users must accept an AI data processing disclosure before executing their first AI analysis. Blocked requests return HTTP 403 `AI_CONSENT_REQUIRED`.
- **Prompt Injection Defense (FR-066)**: Untrusted resume and job description texts are encapsulated in isolated XML-like boundary tags (`<UNTRUSTED_RESUME_TEXT>` and `<UNTRUSTED_JOB_DESCRIPTION>`), instructing the model to treat content strictly as inert data.
- **Multi-Tenancy Isolation (FR-149)**: All resume queries, downloads, and analyses are strictly scoped by `req.user.id`. Access attempts across users return HTTP 404 `NOT_FOUND`.

---

## 3. API Endpoints Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/resumes` | Upload single PDF resume (max 5 MB, max 10 pages) | Required |
| `GET` | `/api/v1/resumes` | List user's resumes (metadata only) | Required |
| `GET` | `/api/v1/resumes/:id` | Get single resume with extracted text & analyses | Required |
| `GET` | `/api/v1/resumes/:id/download-token` | Get 5-minute signed download URL | Required |
| `GET` | `/api/v1/resumes/download/:token` | Stream PDF file via verified HMAC token | Public / Signed |
| `DELETE` | `/api/v1/resumes/:id` | Delete resume, file, and analyses | Required |
| `POST` | `/api/v1/resumes/:id/analyze` | Run general structural AI analysis | Required + Consent + Rate Limit |
| `POST` | `/api/v1/resumes/:id/match` | Run job match analysis against application or JD | Required + Consent + Rate Limit |
| `DELETE` | `/api/v1/resumes/:id/analyses/:analysisId` | Delete specific analysis record | Required |
| `POST` | `/api/v1/users/ai-consent` | Record user AI data processing consent | Required |

---

## 4. Frontend Component Architecture

| Component | Path | Purpose |
|---|---|---|
| `ResumesPage` | `frontend/src/pages/resumes/ResumesPage.jsx` | Full resume management, 10-item limit counter, analysis history tabs |
| `ResumeUploadModal` | `frontend/src/components/resumes/ResumeUploadModal.jsx` | Drag-and-drop PDF upload with 5 MB / PDF validation |
| `AiConsentModal` | `frontend/src/components/resumes/AiConsentModal.jsx` | Explicit user consent modal prior to first AI use (FR-063) |
| `JobMatchModal` | `frontend/src/components/resumes/JobMatchModal.jsx` | Select tracked application or paste custom job description (50–10k chars) |
| `GeneralAnalysisView` | `frontend/src/components/resumes/GeneralAnalysisView.jsx` | Categorized skills, experience timeline, education, and structure feedback |
| `JobMatchView` | `frontend/src/components/resumes/JobMatchView.jsx` | 0–100 match score, component rationales, matched/missing skills, suggestions, disclaimer |

---

## 5. Verification & Test Suite Summary

### Automated Tests (`backend/tests/resumes.test.js`)
All 15 integration tests pass with 100% compliance:
- **PDF Upload**: Valid PDF with extracted text $\ge 100$ characters.
- **Magic Bytes Validation**: Rejects invalid non-PDF file signatures (HTTP 400 `INVALID_FILE_TYPE`).
- **Page Limit Enforcement**: Rejects PDFs exceeding 10 pages (HTTP 400 `PDF_PAGE_LIMIT_EXCEEDED`).
- **10-Resume Account Quota**: 11th upload attempt returns HTTP 409 `RESUME_LIMIT_REACHED`.
- **Signed Download Token**: Validates 5-minute expiry token and streams file; rejects tampered HMAC token with HTTP 403.
- **Multi-Tenancy Isolation**: Non-owner access returns HTTP 404 `NOT_FOUND`.
- **AI Consent Guard**: Returns HTTP 403 `AI_CONSENT_REQUIRED` when consent is unaccepted; grants access after `POST /api/v1/users/ai-consent`.
- **Sliding-Window Rate Limiting**: Enforces 10/hour limit, returns HTTP 429 with `Retry-After` header.
- **General Analysis**: Validates mock structural analysis schema.
- **Job Match Analysis**: Validates score calculation, rationales, matched/missing skills, suggestions, and disclaimer.
- **Analysis Deletion**: Deletes individual analysis record by ID.
- **Cascade Deletion**: Removes physical file and database records cleanly.

**Overall Backend Test Results**: **67 tests passed across 6 test suites** (`auth`, `applications`, `analytics`, `kanban`, `resumes`, `health`).
