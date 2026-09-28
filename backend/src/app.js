const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const requestId = require('./middleware/requestId.middleware');
const errorHandler = require('./middleware/error.middleware');
const { mongoSanitize } = require('./middleware/mongoSanitize.middleware');
const apiRoutes = require('./routes');
const AppError = require('./utils/appError');

const app = express();

// 1. Security HTTP Headers (NFR-SEC-01)
app.use(
  helmet({
    contentSecurityPolicy: false, // Handled per-host or SPA reverse proxy
    crossOriginEmbedderPolicy: false
  })
);

// 2. Strict CORS Allowlist (NFR-SEC-02)
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

if (env.CORS_ORIGIN) {
  env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .forEach((o) => {
      if (!allowedOrigins.includes(o)) {
        allowedOrigins.push(o);
      }
    });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, automated tests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }

      return callback(new AppError(`Origin ${origin} not allowed by CORS`, 403, 'CORS_ERROR'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
  })
);

// 3. Request Body & Cookie Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 4. MongoDB Operator Injection Sanitization (NFR-SEC-06)
app.use(mongoSanitize);

// 5. Request Correlation ID Tracing (FR-130)
app.use(requestId);

// 6. Mount API v1 Routes (FR-125)
app.use('/api/v1', apiRoutes);

// 7. Handle Unknown Routes (404)
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find endpoint ${req.method} ${req.originalUrl} on this server`, 404, 'NOT_FOUND'));
});

// 8. Centralized Error Handling Middleware (FR-127)
app.use(errorHandler);

module.exports = app;
