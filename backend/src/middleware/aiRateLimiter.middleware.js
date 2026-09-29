const AppError = require('../utils/appError');

// In-memory sliding window usage tracker keyed by userId (FR-064)
const userAiUsageMap = new Map();

/**
 * Prune timestamps older than 24 hours
 */
const pruneUsage = (timestamps, now) => {
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  return timestamps.filter((t) => t > oneDayAgo);
};

/**
 * Check if user is within hourly (10) and daily (30) limits (FR-064)
 */
const checkResumeAiQuota = (userId) => {
  const now = Date.now();
  let timestamps = userAiUsageMap.get(String(userId)) || [];
  timestamps = pruneUsage(timestamps, now);
  userAiUsageMap.set(String(userId), timestamps);

  const oneHourAgo = now - 60 * 60 * 1000;
  const hourlyUsage = timestamps.filter((t) => t > oneHourAgo).length;
  const dailyUsage = timestamps.length;

  const HOURLY_LIMIT = 10;
  const DAILY_LIMIT = 30;

  if (hourlyUsage >= HOURLY_LIMIT) {
    // Oldest timestamp in past hour
    const oldestInHour = timestamps.find((t) => t > oneHourAgo);
    const retryAfterSeconds = Math.ceil((oldestInHour + 60 * 60 * 1000 - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      reason: 'Hourly limit of 10 AI resume analyses reached.'
    };
  }

  if (dailyUsage >= DAILY_LIMIT) {
    const oldestInDay = timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestInDay + 24 * 60 * 60 * 1000 - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      reason: 'Daily limit of 30 AI resume analyses reached.'
    };
  }

  return { allowed: true };
};

/**
 * Record successful analysis execution (FR-061: failed analyses do not count)
 */
const recordResumeAiUsage = (userId) => {
  const now = Date.now();
  let timestamps = userAiUsageMap.get(String(userId)) || [];
  timestamps = pruneUsage(timestamps, now);
  timestamps.push(now);
  userAiUsageMap.set(String(userId), timestamps);
};

// In-memory tracker for interview AI requests (FR-064: 20 per hour)
const userInterviewAiUsageMap = new Map();

/**
 * Check if user is within interview AI hourly limit of 20 (FR-064)
 */
const checkInterviewAiQuota = (userId) => {
  const now = Date.now();
  let timestamps = userInterviewAiUsageMap.get(String(userId)) || [];
  timestamps = pruneUsage(timestamps, now);
  userInterviewAiUsageMap.set(String(userId), timestamps);

  const oneHourAgo = now - 60 * 60 * 1000;
  const hourlyUsage = timestamps.filter((t) => t > oneHourAgo).length;
  const HOURLY_LIMIT = 20;

  if (hourlyUsage >= HOURLY_LIMIT) {
    const oldestInHour = timestamps.find((t) => t > oneHourAgo);
    const retryAfterSeconds = Math.ceil((oldestInHour + 60 * 60 * 1000 - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      reason: 'Hourly limit of 20 interview AI preparation requests reached.'
    };
  }

  return { allowed: true };
};

/**
 * Record successful interview AI call (FR-061: failed analyses do not count)
 */
const recordInterviewAiUsage = (userId) => {
  const now = Date.now();
  let timestamps = userInterviewAiUsageMap.get(String(userId)) || [];
  timestamps = pruneUsage(timestamps, now);
  timestamps.push(now);
  userInterviewAiUsageMap.set(String(userId), timestamps);
};

/**
 * Express middleware to enforce AI resume rate limits (FR-064)
 */
const resumeAiRateLimiter = (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  const quota = checkResumeAiQuota(userId);
  if (!quota.allowed) {
    res.setHeader('Retry-After', quota.retryAfterSeconds);
    return next(
      new AppError(
        `${quota.reason} Please retry in ${quota.retryAfterSeconds} seconds.`,
        429,
        'AI_RATE_LIMIT_EXCEEDED'
      )
    );
  }

  next();
};

/**
 * Express middleware to enforce AI interview prep rate limits (FR-064: 20 per hour)
 */
const interviewAiRateLimiter = (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  const quota = checkInterviewAiQuota(userId);
  if (!quota.allowed) {
    res.setHeader('Retry-After', quota.retryAfterSeconds);
    return next(
      new AppError(
        `${quota.reason} Please retry in ${quota.retryAfterSeconds} seconds.`,
        429,
        'AI_RATE_LIMIT_EXCEEDED'
      )
    );
  }

  next();
};

/**
 * Reset helper for testing
 */
const resetAiRateLimits = () => {
  userAiUsageMap.clear();
  userInterviewAiUsageMap.clear();
};

module.exports = {
  resumeAiRateLimiter,
  recordResumeAiUsage,
  checkResumeAiQuota,
  interviewAiRateLimiter,
  recordInterviewAiUsage,
  checkInterviewAiQuota,
  resetAiRateLimits
};

