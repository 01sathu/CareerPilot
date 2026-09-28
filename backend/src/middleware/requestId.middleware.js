const crypto = require('crypto');

/**
 * Request ID Middleware (adhering to SRS FR-130)
 * Assigns a unique trace ID to every incoming request.
 */
const requestId = (req, res, next) => {
  const existingId = req.headers['x-request-id'];
  const reqId = existingId && typeof existingId === 'string'
    ? existingId.slice(0, 64)
    : `req_${crypto.randomBytes(8).toString('hex')}`;

  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
};

module.exports = requestId;
