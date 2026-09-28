/**
 * Standardized API Response Utilities (adhering to SRS FR-126)
 * Format:
 * {
 *   "success": true,
 *   "data": ...,
 *   "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } // Optional
 * }
 */

const success = (res, data = {}, statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    data
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

const created = (res, data = {}, meta = null) => {
  return success(res, data, 201, meta);
};

const noContent = (res) => {
  return res.status(204).send();
};

module.exports = {
  success,
  created,
  noContent
};
