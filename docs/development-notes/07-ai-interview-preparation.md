# Module D — AI Interview Preparation

## 1. Overview & Architectural Scope
The **AI Interview Preparation** module (**Module D**, requirements **FR-068 through FR-079**, acceptance criteria **AC-D-01 through AC-D-05**) enables job seekers to generate realistic technical, behavioral, and HR interview questions tailored to their seniority level, target role, and optional job applications/resumes. It provides two distinct modes of practice:
1. **Practice Mode**: An exploratory, self-paced workspace allowing users to craft answers up to 5,000 characters, toggle educational sample reference answers, bookmark difficult questions for revisit, and request multi-dimensional AI scoring and critique.
2. **Mock Interview Mode**: A step-by-step sequential simulation presenting one question at a time, featuring an on-screen non-blocking stopwatch, pause/resume capability, skipping, and an end-of-interview summary with performance analytics.

All interview sessions, answers, and feedback are stored in the dedicated `InterviewSessions` collection and strictly isolated by user ID (`req.user.id`).

---

## 2. Key Features & SRS Requirements Mapping

### 2.1 Question Generation & Calibration (FR-068, FR-069, FR-070)
- **Inputs**: Requires `roleTitle` (1–120 characters), `experienceLevel` (`fresher`, `junior`, `mid`, `senior`, `lead`), one or more `questionTypes` (`technical`, `hr`, `behavioral`), and count from 5 to 15 (default 10).
- **Context Tailoring**: Accepts optional `applicationId` (using its tracked `jobDescription`) and `resumeId` (using its `extractedText`) to customize questions specifically to the candidate's target company and background.
- **Attributes per Question**: Each question includes `type`, `questionText`, calibrated `difficulty` (`easy`, `medium`, `hard`), and a concise `focusTopic`.
- **Session Persistence**: Stored as an `InterviewSession` document with `mode: practice` or `mode: mock`, retaining all questions and initial state.

### 2.2 Reference Sample Answers (FR-071)
- Candidates can reveal an AI-generated model answer demonstrating structured reasoning (STAR method for behavioral, architectural trade-offs for technical).
- Clearly labeled as an educational sample model rather than the only correct response.
- Generated on-demand and cached directly on the question subdocument.

### 2.3 User Answer Storage & Bookmarking (FR-072, FR-079)
- Users can write, edit, and save draft answers up to 5,000 characters per question.
- Answers persist across browser reloads and sessions.
- Questions can be marked with a `revisit` flag to highlight challenging questions for future review.

### 2.4 Self-Paced Mock Simulation (FR-073, FR-077)
- Presents one question at a time in sequential order.
- Supports skipping questions (`isSkipped: true`) and saving draft responses.
- Allows pausing and resuming at the exact `currentQuestionIndex`.
- Features an optional on-screen stopwatch that never forces an early submission or restricts time.
- **Completion Performance Review (FR-077)**: Computes answered vs. skipped counts, average ratings across evaluated responses, and an organized list of questions flagged for revisiting.

### 2.5 Structured AI Answer Evaluation & Safeguards (FR-074 – FR-076, FR-063 – FR-066)
- **Minimum Character Enforcement (FR-075)**: Answers under 20 characters are rejected locally and at the API with HTTP 400 `ANSWER_TOO_SHORT`, preventing unnecessary LLM invocations.
- **Multi-Dimensional Ratings (FR-074)**:
  - `relevance` (1–5): Direct alignment with the prompt.
  - `structure` (1–5): Organization and logical flow.
  - `clarity` (1–5): Articulate and concise communication.
  - `specificity` (1–5): Concrete examples, metrics, or technical specifics.
- **Feedback Content**: Delivers a concise 1–3 sentence evaluation summary, 1–4 specific strengths, and 1–4 actionable recommendations for improvement.
- **Subjectivity Notice (FR-076)**: Prominently displays the mandatory non-objectivity disclaimer across evaluation views.
- **Security & Quotas**:
  - Enforces mandatory AI data processing consent (FR-063, HTTP 403 `AI_CONSENT_REQUIRED`).
  - Limits interview preparation AI calls to 20 requests/hour (FR-064, HTTP 429 with `Retry-After`).
  - Protects against prompt injection by isolating user answers, job descriptions, and resumes in boundary tags `<UNTRUSTED_USER_ANSWER>`, `<UNTRUSTED_JOB_DESCRIPTION>`, `<UNTRUSTED_RESUME_TEXT>` (FR-065).
  - 60-second timeouts with retry logic on schema errors (FR-059, FR-060).

---

## 3. API Endpoints Reference (`/api/v1/interview-sessions`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/interview-sessions` | Generate interview questions & create prep session (Rate limited: 20/hr; requires AI consent) | Required |
| `GET` | `/api/v1/interview-sessions` | List user's sessions with pagination, question counts, and mode filter | Required |
| `GET` | `/api/v1/interview-sessions/:id` | Get single session with all questions, answers, and feedback | Required |
| `PATCH` | `/api/v1/interview-sessions/:id/questions/:questionId/answer` | Save user answer, mark skipped, toggle revisit, or advance question index | Required |
| `POST` | `/api/v1/interview-sessions/:id/questions/:questionId/example-answer` | Request/retrieve AI reference sample answer (Rate limited) | Required |
| `POST` | `/api/v1/interview-sessions/:id/questions/:questionId/feedback` | Request AI answer evaluation and 1–5 scoring (Rate limited; requires ≥20 chars) | Required |
| `POST` | `/api/v1/interview-sessions/:id/complete` | Finish session and compute summary metrics | Required |
| `DELETE` | `/api/v1/interview-sessions/:id` | Delete interview preparation session | Required |

---

## 4. Frontend Code Splitting & Performance Optimization
To ensure optimal performance and eliminate bundle size warnings:
- Applied route-level lazy loading (`React.lazy()`) across all application pages (`InterviewPrepPage`, `ApplicationsPage`, `CalendarPage`, `ResumesPage`, `DashboardPage`, `ProfilePage`, etc.).
- Wrapped all routes with `<Suspense fallback={<PageLoader />}>`.
- The monolithic >900 kB chunk has been split into small on-demand modules (<440 kB max), ensuring fast first-contentful-paint (FCP).

---

## 5. Automated Verification
All 15 acceptance criteria tests for Module D were implemented and verified with Vitest in `backend/tests/interview-prep.test.js`:
- **AC-D-01**: Question generation creates practice/mock session with count, types, difficulty, and role.
- **AC-D-02**: User answer persistence, editing, and retrieval across reloads.
- **AC-D-03**: Mock session navigation, pausing, resuming, skipping, and completion summary computation.
- **AC-D-04**: AI feedback generation format, 1–5 ratings, non-objectivity notice, and rejection of answers <20 characters with 400.
- **AC-D-05**: Strict user isolation (User B cannot access or delete User A's session, returns 404).
- **Quota & Consent**: Rate limiting (20/hr) with `Retry-After` and AI consent enforcement (403).

**Overall Suite Results**: 98/98 tests passing across all 8 backend test suites.
