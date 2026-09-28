# Module F & G — Interview Calendar & Notifications

## 1. Overview & Architectural Scope
The **Interview Calendar** (**Module F**, requirements **FR-089 through FR-104**, acceptance criteria **AC-F-01 through AC-F-04**) and **In-App Notification System** (**Module G**, requirements **FR-105 through FR-112**, acceptance criteria **AC-G-01 through AC-G-04**) provide comprehensive scheduling, deadline tracking, conflict detection, iCalendar export, and event-driven notifications for CareerPilot users.

All calendar events and notifications are strictly scoped to the authenticated user (`req.user.id`), with 404 `NOT_FOUND` returned on cross-tenant access attempts.

---

## 2. Key Features & SRS Requirements Mapping

### 2.1 Interview Event Management (FR-089 – FR-093)
- **Comprehensive Event Fields**: Captures `userId`, `applicationId` (optional link to tracked application), `type` (`interview`, `assessment`, `follow_up`), `title`, `roundLabel`, `startAt`, `endAt`, `timezone` (IANA format), `format` (`video`, `phone`, `onsite`), `locationOrLink`, `notes`, and `status` (`scheduled`, `completed`, `cancelled`).
- **Validation**: Enforces `endAt > startAt` via Zod schema (`interview.validator.js`).
- **Rescheduling & Duration Preservation**: Updating `startAt` without passing `endAt` automatically preserves the original duration.
- **Calendar Views (FR-093)**:
  - **Month View**: 7-column calendar grid showing scheduled interview badges, format icons, and quick-add controls.
  - **Week View**: 7-day hourly breakdown grid (7 AM to 10 PM) displaying event blocks with duration spans.
  - **List / Agenda View**: Chronologically grouped list (Today, Tomorrow, Upcoming, Past) with search and status filters.
- **Upcoming Widget (FR-094)**: Quick access panel displaying interviews scheduled within the next 30 days.

### 2.2 Conflict Detection & Reschedule Handling (FR-100, FR-092)
- **Non-Blocking Conflict Detection (FR-100)**: Detects overlapping scheduled events for the same user and returns a warning payload (`hasOverlap: true`, `overlappingEvent`) without rejecting creation.
- **Reminder Reset on Reschedule (AC-F-03)**: Rescheduling an event automatically clears the `remindersSent` array so all reminder offsets will trigger anew at the new date/time.

### 2.3 iCalendar (.ics) Export (FR-103)
- **Standard RFC 5545 Compliance**: Generates `.ics` format files with `UID`, `SUMMARY`, `DESCRIPTION`, `DTSTART`, `DTEND`, `LOCATION`, and `STATUS`.
- **Direct Browser Download**: Exportable via `GET /api/v1/interviews/:id/ics`.

### 2.4 Notification Engine & Preferences (FR-105 – FR-112)
- **Supported Notification Types (FR-105, FR-106)**:
  - `interview_reminder`: Triggered by interview reminder offsets.
  - `follow_up_reminder`: Triggered on application follow-up date.
  - `application_status_changed`: Automatically dispatched whenever an application status transitions.
  - `system`: Administrative or platform announcements.
- **User Preference Filtering (FR-111)**: Checks user settings (`interviewReminders`, `followUpReminders`, `statusUpdates`) before creating notifications. Disabled notification types are suppressed; `system` alerts cannot be disabled.
- **Polling & Live Badge (FR-108)**: Header bell badge polls unread count every 60 seconds and on window focus.
- **Actions (FR-109, FR-110)**: Mark read, mark unread, mark all read, delete single notification, and navigate directly to the related interview or application.
- **90-Day Retention (FR-112)**: Automatically purged via MongoDB TTL index on `Notification.createdAt` (`expireAfterSeconds: 7776000`).

### 2.5 Background Scheduler Tick (FR-097 – FR-099)
- **Recurring Engine**: Background scheduler ticks every 5 minutes checking:
  1. Upcoming interview reminder offsets (`15m`, `1h`, `1d`, `2d`) that have not yet been sent.
  2. Application `followUpDate` reaching 09:00 in the user's configured timezone.
- **Deduplication**: Successfully sent reminder offsets are appended to `interview.remindersSent` preventing duplicate notifications.

---

## 3. API Endpoints Reference

### Interview Endpoints (`/api/v1/interviews`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/interviews` | Create interview event (checks overlap, validates `endAt > startAt`) | Required |
| `GET` | `/api/v1/interviews` | List interview events (filters: `startDate`, `endDate`, `status`, `applicationId`) | Required |
| `GET` | `/api/v1/interviews/upcoming` | List upcoming interviews scheduled within next 30 days | Required |
| `GET` | `/api/v1/interviews/:id` | Get single interview details | Required |
| `PATCH` | `/api/v1/interviews/:id` | Update / reschedule interview (resets reminders on time change) | Required |
| `DELETE` | `/api/v1/interviews/:id` | Delete interview event | Required |
| `GET` | `/api/v1/interviews/:id/ics` | Export event as RFC 5545 `.ics` iCalendar file | Required |

### Notification Endpoints (`/api/v1/notifications`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Get paginated notifications (optional filter `isRead`) | Required |
| `GET` | `/api/v1/notifications/unread-count` | Get unread notification count badge | Required |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark single notification as read | Required |
| `PATCH` | `/api/v1/notifications/:id/unread` | Mark single notification as unread | Required |
| `POST` | `/api/v1/notifications/mark-all-read` | Mark all notifications as read | Required |
| `DELETE` | `/api/v1/notifications/:id` | Delete single notification | Required |

---

## 4. Automated Testing & Verification
All 16 acceptance test cases for Module F & G were implemented and verified with Vitest in `backend/tests/calendar-notifications.test.js`:

- **AC-F-01**: Interview creation with valid time range, status, format, and application linking.
- **AC-F-02**: Month and week range queries properly filter events outside date bounds.
- **AC-F-03**: Rescheduling recalculates reminder offsets and clears sent reminder history.
- **AC-F-04**: Overlapping events trigger non-blocking warning while still persisting the event.
- **AC-F-05**: Cross-tenant isolation returns 404 `NOT_FOUND` when modifying another user's event.
- **AC-F-06**: RFC 5545 `.ics` file generation format validation.
- **AC-G-01**: In-app notifications generated for upcoming reminders without duplicate creation.
- **AC-G-02**: Application status transition automatically dispatches notification.
- **AC-G-03**: Read/unread toggling, unread counter badge calculation, and mark all read.
- **AC-G-04**: Respects user notification preferences and suppresses disabled notification types.
- **AC-G-05**: Cascading deletion cleans up linked notifications and interviews upon application removal.

**Test Suite Results**: 83/83 passing across 7 test suites.
