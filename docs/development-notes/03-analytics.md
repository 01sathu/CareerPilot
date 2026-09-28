# Module E — Career Analytics Dashboard

## 1. Overview & Architectural Scope
The Career Analytics Dashboard (**Module E**, requirements **FR-080 through FR-088**) provides users with deep, deterministic visibility into their job search pipeline, application volume trends, and interview conversion funnels. 

Unlike naive dashboard metrics that derive conversion rates from volatile current states, CareerPilot strictly computes its conversion rates from the immutable `ApplicationHistory` event log (**FR-045, FR-082**). This guarantees that historical milestones are permanently preserved regardless of subsequent status updates.

---

## 2. Mathematical Formulations & Requirements Mapping

### 2.1 Core Application Counts (FR-080, FR-081)
- **Total Applications**: Total count of applications owned by the user.
- **Counts per Status**: Individual counts for each canonical state:
  `wishlist`, `applied`, `assessment`, `interview`, `offer`, `rejected`.
- **Active Pipeline Count**: Sum of applications in actionable search stages:
  $$\text{Active Pipeline} = \text{applied} + \text{assessment} + \text{interview}$$

### 2.2 Historical Conversion Funnel & Safe Zero-Denominator Handling (FR-082, FR-088)
Conversion rates are derived by querying distinct `applicationId`s in `ApplicationHistory` where `userId = req.user.id` and `toStatus` reached a specific milestone:
- **Applied to Interview**:
  $$\text{Rate} = \frac{\text{Applications that ever reached interview}}{\text{Applications that ever reached applied}}$$
- **Interview to Offer**:
  $$\text{Rate} = \frac{\text{Applications that ever reached offer}}{\text{Applications that ever reached interview}}$$
- **Overall Offer Rate**:
  $$\text{Rate} = \frac{\text{Applications that ever reached offer}}{\text{Applications that ever reached applied}}$$

**Edge-Case Guard**: When any denominator is $0$, the rate is safely computed as `null` and displayed in the UI as `"–"`, never throwing a division-by-zero exception. All conversion rates also return their raw counts (`numerator` and `denominator`, e.g., `"3 of 12"`) to make small sample sizes immediately transparent to the candidate (**FR-088**).

### 2.3 Timezone-Aware Trend Bucketing (FR-083, FR-086)
Trends are bucketed by `appliedDate` aligned to the user's configured IANA timezone (e.g. `'UTC'`, `'Asia/Kolkata'`, `'America/New_York'`).
- **Weekly Trend (12 Weeks)**: 12 consecutive buckets ending on the current week. Weeks strictly start on Monday at 00:00:00 local time.
- **Monthly Trend (12 Months)**: 12 consecutive calendar months ending on the current month.
- **30-Day View**: Daily application count for the trailing 30 days.
- **Zero-Filling**: Every single bucket is guaranteed to be returned with `count: 0` if no applications occurred in that interval (**FR-083**).

### 2.4 Deterministic Progress Summary (FR-085)
Non-AI deterministic statements computed purely from database timestamps and actions:
1. Number of applications submitted in trailing 30 days.
2. Number of follow-ups currently due (`followUpDate <= now` for non-terminal statuses).
3. Number of active opportunities in the pipeline.

---

## 3. Backend Implementation

### 3.1 Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/overview` | Bearer JWT | Fetch full metrics overview (counts, funnels, trends, progress) |

### 3.2 Query Parameters & Validation
- `range`: Optional enum `['30d', '90d', '12w', '12m']`
- `timezone`: Optional string (max 60 characters)
- Validated with Zod (`analyticsOverviewQuerySchema`). Unrecognized query parameters return HTTP 400 `VALIDATION_ERROR`.

### 3.3 Security & Multi-Tenancy Isolation (FR-149, FR-150)
All database queries (`Application.aggregate`, `ApplicationHistory.aggregate`, `Application.countDocuments`) are scoped strictly to `new mongoose.Types.ObjectId(req.user.id)`. No client-supplied user ID is honored.

---

## 4. Frontend UI/UX Architecture

- **Visual Dashboard**: Located on the authenticated home route (`/` and `/dashboard`).
- **Metric Cards (`SummaryCards.jsx`)**: High-level counters with icons and status colors.
- **Interactive Trend Chart (`TrendChart.jsx`)**: Built with Recharts. Features an interactive toggle between 12 Weeks, 12 Months, and 30 Days.
- **Status Distribution (`StatusDistributionChart.jsx`)**: Recharts Donut chart displaying proportion across all 6 canonical states.
- **Conversion Funnel (`ConversionFunnel.jsx`)**: Visual conversion stages displaying percentages and raw counts ("3 of 12"). Includes mandatory disclaimer (**FR-088**) explaining that metrics are personal statistics, not market predictions.
- **Empty State (`EmptyAnalyticsState.jsx`)**: Rendered when `total === 0` with an engaging call-to-action button to log the first application (**FR-087**).
- **Accessibility (WCAG 2.1 AA / FR-084, AC-E-05)**: Every chart includes an accessible HTML data table alternative with an interactive view toggle and semantic table tags for screen readers.

---

## 5. Verification & Test Coverage

### Automated Backend Tests (`backend/tests/analytics.test.js`)
1. **Unauthenticated Access**: Verifies 401 `UNAUTHORIZED`.
2. **Input Validation**: Verifies 400 `VALIDATION_ERROR` on malformed ranges or unexpected query parameters.
3. **Zero-Data State**: Verifies `null` conversion rates, zero counts, and zero-filled trend arrays.
4. **Deterministic Math**: Tests a seeded multi-state dataset verifying exact status counts, active counts, and conversion percentages ($40\%$, $50\%$, $20\%$).
5. **Zero-Filled Trends**: Verifies 12 weekly buckets (Monday start) and 12 monthly buckets.
6. **Progress Statements**: Verifies accurate sentence generation for 30-day submissions and follow-ups.
7. **Multi-Tenancy Isolation**: Verifies User B receives 0 counts and cannot access User A's statistics.
