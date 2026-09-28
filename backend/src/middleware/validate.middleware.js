const AppError = require('../utils/appError');

/**
 * Zod Schema Validation Middleware
 * Validates request body, query, or params.
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details));
      }
      next(err);
    }
  };
};

module.exports = validate;
