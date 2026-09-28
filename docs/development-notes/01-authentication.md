# Module A — Authentication & User Management (Phase 1)

## 1. What Was Built
Phase 1 implements complete, production-grade authentication and user identity management for CareerPilot, adhering strictly to **SRS Module A (FR-001 through FR-023)** and security non-functional requirements:
1. **User Mongoose Schema**:
   - `name` (2–80 characters), `email` (unique, lowercase, trimmed), `passwordHash` (bcrypt cost factor $\ge 12$).
   - Profile: `headline` ($\le 120$ chars), `skills` (max 50, deduplicated case-insensitively), `experienceLevel` (`fresher`, `junior`, `mid`, `senior`, `lead`), `targetRoles` (max 10), `preferredLocations` (max 10), `openToRemote` boolean.
   - Settings: IANA `timezone` (defaults to UTC/browser), `notificationPreferences`, and `aiConsentAcceptedAt`.
   - Security: Hashed refresh tokens array with token families, single-use password reset tokens with 60-minute expiration.
2. **Dual-Token Authentication Architecture**:
   - **Access Token**: Short-lived (15 minutes) signed JWT containing **only** `{ sub: userId }` (FR-009). No email, role, or sensitive data in the token payload. Held **strictly in frontend memory** (never in `localStorage` or `sessionStorage` to mitigate XSS attacks).
   - **Refresh Token**: Opaque cryptographically random token (40 bytes / 80 hex chars) valid for 7 days. Stored as a SHA-256 hash in the database and delivered in an `HttpOnly`, `Secure` (production), `SameSite` cookie (FR-010).
3. **Refresh Token Rotation & Reuse Detection**:
   - Every time `/api/v1/auth/refresh` is called, the old refresh token is invalidated, and a new token is generated within the same token family.
   - **Reuse Detection (FR-010)**: If an already-rotated/revoked token is submitted, the system flags a token reuse breach and revokes **all** active refresh tokens for that user immediately.
4. **Password Reset & Account Security**:
   - `POST /api/v1/auth/forgot-password`: Returns identical generic success response whether or not the email exists (preventing email enumeration attacks per FR-014).
   - Generates a single-use crypto-random reset token stored only as a SHA-256 hash valid for 60 minutes (FR-015). In local development, the reset link is printed to the server console (FR-016).
   - `POST /api/v1/auth/reset-password`: Verifies the token, hashes the new password with bcrypt, and revokes all active refresh tokens.
   - `POST /api/v1/auth/change-password`: Authenticated endpoint requiring current password, validating that the new password satisfies complexity rules and differs from current password, and revoking all other refresh tokens (FR-116).
5. **Rate Limiting & Input Validation**:
   - Login rate-limited to 5 failed attempts per 15 minutes per email + IP combination returning HTTP 429 with `Retry-After` header (FR-008).
   - Zod schemas validating password complexity (8–128 characters, $\ge 1$ uppercase, $\ge 1$ lowercase, $\ge 1$ digit) across both frontend and backend.
6. **Frontend State & Silent Refresh**:
   - `AuthContext` provides authentication state (`user`, `isAuthenticated`, `isLoading`, `login`, `register`, `logout`).
   - Axios response interceptor intercepts 401s on protected endpoints and silently calls `/api/v1/auth/refresh` with queue management.
   - Route guards (`ProtectedRoute` and `GuestRoute`) preventing unauthenticated access to private views while preserving intended redirect targets.

---

## 2. Why Was It Built This Way? (Engineering Decisions)

### Memory-Only Access Token vs LocalStorage
- **The Problem**: Storing JWT access tokens in `localStorage` or `sessionStorage` makes them vulnerable to cross-site scripting (XSS). Any compromised script or malicious third-party dependency can steal the token with `localStorage.getItem('token')`.
- **The Solution**: CareerPilot holds the access token **only in memory** (a JavaScript closure in `api.js`). When the page reloads, an `HttpOnly` cookie (which JavaScript cannot read) automatically refreshes the access token via `/api/v1/auth/refresh`.

### Rotating Refresh Tokens & Token Reuse Detection
- **The Problem**: If a refresh token is stolen, an attacker could maintain permanent access to the victim's account.
- **The Solution**: Every refresh operation invalidates the previous token and generates a new one. If the legitimate user and an attacker both try to use the same token (or a used token is submitted again), the server detects a collision and **wipes all tokens for that user**, forcing re-authentication.

### Token Payload Minimization (FR-009)
- **The Decision**: The JWT contains only `{ sub: user._id }`. Putting user email, role, or profile data inside the JWT is risky because JWTs are base64-encoded and readable by anyone who intercepts the network traffic.

### Silent Token Refresh via Axios Interceptors
- When an access token expires after 15 minutes, API requests fail with 401. Rather than forcing the user to log in again, the Axios response interceptor intercepts the 401, pauses outgoing requests, requests a new access token using the refresh cookie, updates memory, and retries the original request seamlessly.

---

## 3. How the Authentication Flow Works

### Registration & Login Flow
```text
Client (React)                              Backend (Express)                 MongoDB
      |                                             |                            |
      |--- POST /auth/register (name, email, pwd) ->|                            |
      |                                             |--- Check duplicate email ->|
      |                                             |--- bcrypt.hash(pwd) ------>|
      |                                             |--- Store user in DB ------>|
      |                                             |--- Create JWT & Refresh -->|
      |<-- 201 Created + Cookie: refreshToken ------|                            |
      |    Body: { success, data: { user, token } } |                            |
```

### Silent Refresh Flow (Every 15 Minutes or on Page Reload)
```text
Client (React)                              Backend (Express)                 MongoDB
      |                                             |                            |
      |--- POST /auth/refresh (Cookie: refreshToken)|                            |
      |                                             |--- SHA256(token) --------->|
      |                                             |--- Verify token record --->|
      |                                             |--- Rotate token & save --->|
      |<-- 200 OK + New Cookie: refreshToken -------|                            |
      |    Body: { success, data: { user, token } } |                            |
```

---

## 4. API Specification for Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register new user. Sets refresh cookie, returns access token + user. |
| `POST` | `/api/v1/auth/login` | Public | Authenticate with email/password. Rate-limited (5 fails / 15 min). |
| `POST` | `/api/v1/auth/refresh` | Public (Cookie) | Rotates refresh token, issues new access token. Detects reuse. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revokes refresh token in DB and clears cookie. |
| `POST` | `/api/v1/auth/forgot-password` | Public | Initiates password reset. Emits token to server console in dev. |
| `POST` | `/api/v1/auth/reset-password` | Public | Resets password with single-use token; revokes all sessions. |
| `POST` | `/api/v1/auth/change-password` | Protected | Changes password; revokes all other sessions. |
| `GET` | `/api/v1/users/me` | Protected | Returns authenticated user profile. |
| `PATCH` | `/api/v1/users/me` | Protected | Updates profile (skills, headline, timezone, target roles). |

---

## 5. Security & Error Handling Matrix

| Scenario | HTTP Status | Error Code | Response Behavior |
|---|---|---|---|
| Duplicate Email Registration | 409 Conflict | `EMAIL_ALREADY_REGISTERED` | Clear message to user |
| Invalid Password Complexity | 400 Bad Request | `VALIDATION_ERROR` | Detailed field-level error |
| Invalid Email or Password on Login | 401 Unauthorized | `INVALID_CREDENTIALS` | Generic message (no user enumeration) |
| Exceeded Login Rate Limit | 429 Too Many Requests | `RATE_LIMIT_EXCEEDED` | `Retry-After: 900` header |
| Missing / Malformed JWT | 401 Unauthorized | `UNAUTHORIZED` / `INVALID_TOKEN` | Request rejected |
| Expired Access Token | 401 Unauthorized | `TOKEN_EXPIRED` | Triggers client silent refresh |
| Refresh Token Reuse Detected | 401 Unauthorized | `TOKEN_REUSE_DETECTED` | All user refresh tokens revoked |
| Invalid / Expired Reset Token | 400 Bad Request | `INVALID_RESET_TOKEN` | Single-use guard |

---

## 6. How I Would Explain This in an Interview

> "In Phase 1 of CareerPilot, I implemented a defense-in-depth authentication system designed specifically to mitigate common web security vulnerabilities.
> 
> Instead of storing JWTs in `localStorage` where they are vulnerable to XSS, I engineered a dual-token mechanism: a short-lived 15-minute JWT access token held in-memory, paired with an `HttpOnly`, `SameSite` refresh token cookie valid for 7 days.
> 
> To protect against token theft, I implemented refresh token rotation with token-family reuse detection. If an already-rotated token is ever replayed, the backend flags a security breach and automatically invalidates all active sessions for that user.
> 
> Passwords are encrypted using bcrypt with a cost factor of 12, and password reset endpoints use SHA-256 hashed single-use tokens with a 60-minute expiry while returning generic responses to eliminate user enumeration. On the client, I built an Axios response interceptor that transparently handles silent token refreshes so users remain logged in seamlessly without compromising on security."
