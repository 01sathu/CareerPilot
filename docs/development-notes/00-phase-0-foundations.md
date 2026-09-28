# Phase 0 — Architecture Foundations, Database Connection & Error Handling

## 1. What Was Built
Phase 0 establishes the bedrock for the CareerPilot platform:
1. **Centralized Error Handling Architecture**: Custom `AppError` class and an Express error middleware that intercepts all operational errors, schema validation mismatches, NoSQL query syntax errors, and uncaught exceptions.
2. **Predictable API Envelope**: Strict enforcement of `{ success: true, data, meta }` for successful requests and `{ success: false, error: { code, message, details, requestId } }` for errors.
3. **Correlation ID Tracking**: `requestId.middleware.js` generates a unique trace ID per incoming request (`req.id`), attaching it to HTTP headers (`X-Request-Id`) and error responses for end-to-end debugging.
4. **Mongoose Database Connection Module**: `config/db.js` handles MongoDB Atlas and local MongoDB connection lifecycles with reconnection logic, connection pooling, and graceful teardown on process signals (`SIGINT`, `SIGTERM`).
5. **System Health Endpoint (`GET /api/v1/health`)**: Public diagnostic endpoint returning service status, uptime, and database connection state without leaking internal secrets.
6. **Vite + React + Tailwind Frontend Foundation**: Scaffolding with development proxy configuration so frontend requests to `/api` route seamlessly to the backend without cross-origin cookie complications.

---

## 2. Why Was It Built This Way?
- **Separation of Concerns**: Controllers should never manually catch errors and craft ad-hoc error responses. By throwing operational errors to `next(err)`, error formatting is unified across every endpoint.
- **Security by Design**: FR-134 forbids leaking stack traces, password hashes, or internal database metadata in production. The centralized error middleware masks internal 500 errors into clean, user-friendly messages while logging detailed diagnostics server-side.
- **Traceability in Production**: When a user encounters an error, having a unique `requestId` allows support or backend engineers to cross-reference server logs immediately without needing the user's password or sensitive inputs.
- **Dev-to-Prod Parity**: Vite's proxy mirrors production single-domain deployments, avoiding complex CORS and `SameSite` cookie quirks during local development.

---

## 3. How It Works (Step-by-Step)

```text
Incoming Request -> [requestId.middleware] (assigns req.id)
                 -> [Security Middlewares (Helmet, CORS, CookieParser)]
                 -> [Route Handler: /api/v1/health]
                 -> [Controller] -> [apiResponse.success()] -> Client
                 
If an error occurs:
                 -> next(new AppError('Resource not found', 404, 'NOT_FOUND'))
                 -> [error.middleware]
                    • Detects status code & operational status
                    • Masks unexpected errors if in production
                    • Attaches requestId
                    • Returns standard JSON error envelope -> Client
```

---

## 4. Key Concepts to Understand

### Centralized Error Handling vs Ad-Hoc Try-Catch
- **Ad-Hoc (Anti-pattern)**: Every controller repeats `try { ... } catch (err) { res.status(500).json({ error: err.message }); }`. This results in inconsistent JSON shapes, leaky error messages, and boilerplate.
- **Centralized (Best Practice)**: Controllers handle only the happy path or delegate unexpected errors using `next(err)`. A single middleware formats every error into the SRS-mandated envelope.

### Operational vs Programmer Errors
- **Operational Errors**: Predictable runtime conditions (e.g. invalid password, duplicate email, entity not found). These are represented by `AppError` with `isOperational = true` and specific HTTP status codes.
- **Programmer Errors**: Bugs, syntax errors, or unhandled null dereferences. These default to HTTP 500 with a generic `"Internal server error"` response to the client.

---

## 5. How I Would Explain This in an Interview

> "In Phase 0, I established the production baseline for CareerPilot before writing business features. 
> 
> I created a centralized error handling pipeline in Express with a custom `AppError` class. This ensures every API response follows an immutable envelope contract `{ success, data/error }` required by our SRS. I also added a request correlation ID middleware that tags every request with a UUID, allowing us to trace bugs in logs without exposing internal stack traces to users. 
> 
> For the database, I wrapped Mongoose with connection pooling and graceful shutdown hooks for `SIGINT` and `SIGTERM`. Finally, I added a `/api/v1/health` endpoint and configured a Vite development proxy so frontend requests can share cookies and avoid cross-origin friction during development."
