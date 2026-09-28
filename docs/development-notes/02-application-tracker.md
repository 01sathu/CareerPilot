# Module B — Job Application Tracker: Table View & History (Phase 2)

## 1. What Was Built
Phase 2 implements the core Job Application Tracker for CareerPilot according to **SRS Module B (FR-024 through FR-045)** and **Activity History (FR-113, FR-114)**:
1. **Application Mongoose Model**:
   - Fields: `userId` (indexed), `companyName` (1–120), `jobTitle` (1–120), `location` ($\le 120$), `status` (`wishlist`, `applied`, `assessment`, `interview`, `offer`, `rejected`), `salary` (`min`, `max`, `currency`, `period`), `jobDescription` ($\le 10,000$), `applicationUrl` ($\le 2,048$), `notes` ($\le 5,000$, plain text), `appliedDate`, `followUpDate`, `deadlineDate`.
   - Compound indexes: `{ userId: 1, updatedAt: -1 }`, `{ userId: 1, status: 1 }`, `{ userId: 1, companyName: 1 }`, `{ userId: 1, appliedDate: -1 }`.
2. **ApplicationHistory Mongoose Model**:
   - Immutable audit trail recording every state change and scalar field update.
   - Fields: `applicationId`, `userId`, `eventType` (`created`, `status_changed`, `updated`), `fromStatus`, `toStatus`, `changedFields`, `note` ($\le 500$), `timestamp`.
   - Authoritative source for conversion funnels and career analytics in Module E.
3. **Application Lifecycle CRUD**:
   - `POST /api/v1/applications`: Creates an application, auto-populates `appliedDate` if status is `applied` (FR-030), and logs initial `created` history record.
   - `GET /api/v1/applications`: Server-side paginated list with case-insensitive substring search (company, title, location), status filter, location filter, date range filter, and sorting.
   - `GET /api/v1/applications/:id`: Returns application details along with its chronological status history timeline.
   - `PATCH /api/v1/applications/:id`: Performs partial updates, detects status transitions, auto-sets `appliedDate` if first moving to `applied`, and records `status_changed` history records with optional user transition notes.
   - `DELETE /api/v1/applications/:id`: Cascades to permanently delete the application and all associated `ApplicationHistory` records (FR-029).
4. **Strict Multi-Tenancy Isolation**:
   - Every database query is scoped by `req.user.id`.
   - Cross-user resource requests return **HTTP 404 NOT_FOUND** (FR-149, FR-150) rather than 403, preventing resource existence leakage.
5. **Interactive Table & Timeline Frontend**:
   - Responsive table displaying company, role, location, status badge, applied date, follow-up date, and last updated date.
   - Inline status dropdown on table rows (FR-040) for rapid pipeline updates.
   - Search input debounced by 300 ms (FR-033).
   - Status filter tabs, location filter, and multi-field sorting.
   - Create/Edit modal with comprehensive validation and compensation inputs.
   - Chronological status & activity timeline modal with transition notes.
   - Destructive deletion confirmation dialog (FR-029).
   - Loading skeletons, filter empty states, zero-data onboarding states (FR-087), and error banners with retry.

---

## 2. Why Was It Built This Way? (Engineering Decisions)

### Dedicated Immutable History Collection vs Storing History on the Document
- **The Problem**: Storing an array of history entries directly inside the `Application` document causes unbounded document growth (document bloat) and makes aggregate conversion queries across all applications computationally expensive.
- **The Solution**: An independent `ApplicationHistory` collection indexed by `applicationId` and `timestamp`. This keeps the `Application` document lightweight and allows high-performance aggregation pipelines in Module E (Analytics) to query historical conversion rates ("ever reached status X").

### Auto-Setting `appliedDate` on First Transition to `applied` (FR-030)
- Many users move a job from `wishlist` to `applied` without manually filling out a date picker. To ensure accurate conversion metrics and trend analytics, the backend automatically stamps `appliedDate` with the current timestamp if left empty.

### Server-Side Pagination & Compound Indexing (FR-032, NFR-PERF-01)
- Rather than loading thousands of applications into the browser and filtering client-side, the backend uses compound indexes (`{ userId: 1, updatedAt: -1 }`) and returns `{ applications, meta: { page, limit, total, totalPages } }`. This bounds API response times to $<500$ ms regardless of user data size.

### Plain-Text Rendering of Notes & Descriptions (NFR-SEC-14)
- User notes and job descriptions can contain untrusted external text (e.g. copied from job boards). To eliminate Stored XSS attacks, these fields are treated as plain text strings and never passed to `dangerouslySetInnerHTML`.

---

## 3. API Contract for Applications

| Method | Endpoint | Access | Query / Body Parameters | Response |
|---|---|---|---|---|
| `POST` | `/api/v1/applications` | Protected | Body: `companyName`, `jobTitle`, `location`, `status`, `salary`, `applicationUrl`, `notes`, `appliedDate`, `followUpDate`, `deadlineDate` | `201 Created` with application object |
| `GET` | `/api/v1/applications` | Protected | Query: `page`, `limit`, `search`, `status`, `location`, `appliedFrom`, `appliedTo`, `sortBy`, `sortOrder` | `200 OK` with applications list & pagination `meta` |
| `GET` | `/api/v1/applications/:id` | Protected | Path: `:id` | `200 OK` with `{ application, history: [...] }` |
| `PATCH` | `/api/v1/applications/:id` | Protected | Path: `:id`, Body: partial updates, optional `statusNote` | `200 OK` with updated application |
| `DELETE` | `/api/v1/applications/:id` | Protected | Path: `:id` | `200 OK` with confirmation message |

---

## 4. How I Would Explain This in an Interview

> "In Phase 2 of CareerPilot, I built the Job Application Tracker following a modular domain-driven approach.
> 
> A key architectural decision was separating `Application` from `ApplicationHistory`. When an application's status changes from Wishlist to Applied or Interview, the service automatically writes an immutable event record to `ApplicationHistory` recording the transition, timestamp, and optional user note. This design keeps documents lean and powers our conversion analytics in later modules.
> 
> Security and data isolation are strictly enforced: all queries are scoped to the authenticated user ID (`req.user.id`), and cross-user lookups return HTTP 404 to avoid leaking resource existence. 
> 
> On the frontend, I engineered a responsive table view with 300ms debounced search, status filtering, multi-column sorting, and server-side pagination, along with an interactive modal displaying the chronological activity timeline."
