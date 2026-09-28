const mongoose = require('mongoose');
const Application = require('../models/Application');
const ApplicationHistory = require('../models/ApplicationHistory');
const User = require('../models/User');

/**
 * Validates and normalizes IANA timezone identifier
 */
const getValidTimezone = (tz) => {
  if (!tz) return 'UTC';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
};

/**
 * Get date parts in target timezone
 */
const getDatePartsInTimezone = (date, timezone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const partMap = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  // Calculate day of week index: Mon = 1, Tue = 2, ..., Sun = 7
  const weekdayShort = partMap.weekday; // 'Mon', 'Tue', ...
  const dayIndexMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const dayOfWeek = dayIndexMap[weekdayShort] || 1;

  return {
    year: parseInt(partMap.year, 10),
    month: parseInt(partMap.month, 10), // 1-12
    day: parseInt(partMap.day, 10),
    dayOfWeek
  };
};

/**
 * Generate 12 weekly buckets (Monday start) ending with current week
 */
const generateWeeklyBuckets = (now, timezone) => {
  const buckets = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Calculate start of current week (Monday 00:00:00 in timezone)
  const currentParts = getDatePartsInTimezone(now, timezone);
  const daysSinceMonday = currentParts.dayOfWeek - 1;

  // Anchor to Monday of current week at approximate UTC offset
  const anchorMondayUtc = new Date(now.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  // Normalize time to noon to avoid daylight saving edge skips when subtracting 7 days
  anchorMondayUtc.setUTCHours(12, 0, 0, 0);

  for (let i = 11; i >= 0; i--) {
    const weekMonday = new Date(anchorMondayUtc.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekSunday = new Date(weekMonday.getTime() + 6 * 24 * 60 * 60 * 1000);

    const startParts = getDatePartsInTimezone(weekMonday, timezone);
    const endParts = getDatePartsInTimezone(weekSunday, timezone);

    // Approximate UTC boundary for matching
    // Start: Monday 00:00:00 local time
    const startBoundary = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day, 0, 0, 0, 0));
    // End: Sunday 23:59:59.999 local time
    const endBoundary = new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day, 23, 59, 59, 999));

    const label = `${monthNames[startParts.month - 1]} ${startParts.day}`;
    const period = `${startParts.year}-W${String(Math.ceil(startParts.day / 7)).padStart(2, '0')}`;

    buckets.push({
      period,
      label,
      startBoundary,
      endBoundary,
      count: 0
    });
  }

  return buckets;
};

/**
 * Generate 12 monthly buckets ending with current month
 */
const generateMonthlyBuckets = (now, timezone) => {
  const buckets = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentParts = getDatePartsInTimezone(now, timezone);

  let curYear = currentParts.year;
  let curMonth = currentParts.month; // 1-12

  for (let i = 11; i >= 0; i--) {
    let year = curYear;
    let month = curMonth - i;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }

    const startBoundary = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    // Last day of month
    const endBoundary = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const period = `${year}-${String(month).padStart(2, '0')}`;
    const label = `${monthNames[month - 1]} ${year}`;

    buckets.push({
      period,
      label,
      startBoundary,
      endBoundary,
      count: 0
    });
  }

  return buckets;
};

/**
 * Generate 30 daily buckets ending with today (FR-086)
 */
const generateDailyBuckets = (now, timezone) => {
  const buckets = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 29; i >= 0; i--) {
    const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const parts = getDatePartsInTimezone(dayDate, timezone);

    const startBoundary = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
    const endBoundary = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999));

    const period = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    const label = `${monthNames[parts.month - 1]} ${parts.day}`;

    buckets.push({
      period,
      label,
      startBoundary,
      endBoundary,
      count: 0
    });
  }

  return buckets;
};

/**
 * Get comprehensive career analytics overview for authenticated user
 * Strictly scoped to userId (FR-080 - FR-088, FR-149)
 */
const getOverview = async (userId, options = {}) => {
  const objectUserId = new mongoose.Types.ObjectId(userId);

  // Determine user timezone (FR-083, FR-022)
  let userTimezone = 'UTC';
  if (options.timezone) {
    userTimezone = getValidTimezone(options.timezone);
  } else {
    const userDoc = await User.findById(userId).select('timezone');
    if (userDoc?.timezone) {
      userTimezone = getValidTimezone(userDoc.timezone);
    }
  }

  // 1. Current Application Counts by Status (FR-080, FR-081)
  const statusAggregation = await Application.aggregate([
    { $match: { userId: objectUserId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const defaultStatusCounts = {
    wishlist: 0,
    applied: 0,
    assessment: 0,
    interview: 0,
    offer: 0,
    rejected: 0
  };

  let totalApplications = 0;
  statusAggregation.forEach((item) => {
    if (defaultStatusCounts[item._id] !== undefined) {
      defaultStatusCounts[item._id] = item.count;
    }
    totalApplications += item.count;
  });

  // Active pipeline: applied + assessment + interview (FR-080)
  const activeApplications =
    defaultStatusCounts.applied +
    defaultStatusCounts.assessment +
    defaultStatusCounts.interview;

  // 2. Historical Conversion Rates from ApplicationHistory (FR-082, FR-045, FR-088)
  // Authoritative "ever reached status X" distinct application counts
  const historyAggregation = await ApplicationHistory.aggregate([
    {
      $match: {
        userId: objectUserId,
        toStatus: { $in: ['applied', 'interview', 'offer'] }
      }
    },
    {
      $group: {
        _id: '$toStatus',
        uniqueApps: { $addToSet: '$applicationId' }
      }
    }
  ]);

  const historyCounts = {
    applied: 0,
    interview: 0,
    offer: 0
  };

  historyAggregation.forEach((item) => {
    if (historyCounts[item._id] !== undefined) {
      historyCounts[item._id] = item.uniqueApps.length;
    }
  });

  const calcConversionMetric = (numerator, denominator) => {
    if (!denominator || denominator === 0) {
      return {
        rate: null,
        percentage: null,
        numerator,
        denominator
      };
    }
    const rate = Math.round((numerator / denominator) * 1000) / 1000;
    const percentage = Math.round((numerator / denominator) * 1000) / 10;
    return {
      rate,
      percentage,
      numerator,
      denominator
    };
  };

  // Applied -> Interview: ever reached interview ÷ ever reached applied
  const appliedToInterview = calcConversionMetric(
    historyCounts.interview,
    historyCounts.applied
  );

  // Interview -> Offer: ever reached offer ÷ ever reached interview
  const interviewToOffer = calcConversionMetric(
    historyCounts.offer,
    historyCounts.interview
  );

  // Overall Offer Rate: ever reached offer ÷ ever reached applied
  const overallOfferRate = calcConversionMetric(
    historyCounts.offer,
    historyCounts.applied
  );

  // 3. Application Trends Bucketed in User's Timezone (FR-083, FR-086)
  // Fetch all applications with an appliedDate for the user
  const applicationsWithDate = await Application.find({
    userId: objectUserId,
    appliedDate: { $ne: null }
  }).select('appliedDate');

  const now = new Date();
  const weeklyBuckets = generateWeeklyBuckets(now, userTimezone);
  const monthlyBuckets = generateMonthlyBuckets(now, userTimezone);
  const dailyBuckets = generateDailyBuckets(now, userTimezone);

  // Bucket each applied date
  applicationsWithDate.forEach((app) => {
    const appTime = new Date(app.appliedDate).getTime();

    // Weekly
    for (const bucket of weeklyBuckets) {
      if (appTime >= bucket.startBoundary.getTime() && appTime <= bucket.endBoundary.getTime()) {
        bucket.count++;
        break;
      }
    }

    // Monthly
    for (const bucket of monthlyBuckets) {
      if (appTime >= bucket.startBoundary.getTime() && appTime <= bucket.endBoundary.getTime()) {
        bucket.count++;
        break;
      }
    }

    // Daily
    for (const bucket of dailyBuckets) {
      if (appTime >= bucket.startBoundary.getTime() && appTime <= bucket.endBoundary.getTime()) {
        bucket.count++;
        break;
      }
    }
  });

  // Strip boundary date objects from client response
  const formatBuckets = (buckets) =>
    buckets.map(({ period, label, count }) => ({
      period,
      label,
      count
    }));

  // 4. Deterministic Progress Summary (FR-085)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const appliedLast30Days = await Application.countDocuments({
    userId: objectUserId,
    appliedDate: { $gte: thirtyDaysAgo, $lte: now }
  });

  const followUpsDue = await Application.countDocuments({
    userId: objectUserId,
    followUpDate: { $ne: null, $lte: now },
    status: { $nin: ['offer', 'rejected'] }
  });

  const upcomingFollowUpsNext7Days = await Application.countDocuments({
    userId: objectUserId,
    followUpDate: { $gt: now, $lte: sevenDaysAhead },
    status: { $nin: ['offer', 'rejected'] }
  });

  // Construct clear, deterministic progress statements
  const statements = [];
  statements.push(
    `You submitted ${appliedLast30Days} application${appliedLast30Days === 1 ? '' : 's'} in the last 30 days.`
  );

  if (followUpsDue > 0) {
    statements.push(
      `${followUpsDue} application${followUpsDue === 1 ? ' currently requires' : 's currently require'} follow-up.`
    );
  } else if (upcomingFollowUpsNext7Days > 0) {
    statements.push(
      `${upcomingFollowUpsNext7Days} upcoming follow-up${upcomingFollowUpsNext7Days === 1 ? '' : 's'} scheduled in the next 7 days.`
    );
  } else {
    statements.push('All follow-ups are up to date.');
  }

  statements.push(
    `${activeApplications} application${activeApplications === 1 ? ' is' : 's are'} active in your pipeline.`
  );

  return {
    counts: {
      total: totalApplications,
      active: activeApplications,
      byStatus: defaultStatusCounts
    },
    conversionRates: {
      appliedToInterview,
      interviewToOffer,
      overallOfferRate
    },
    trends: {
      weekly: formatBuckets(weeklyBuckets),
      monthly: formatBuckets(monthlyBuckets),
      daily30d: formatBuckets(dailyBuckets)
    },
    progressSummary: {
      appliedLast30Days,
      followUpsDue,
      upcomingFollowUpsNext7Days,
      activeApplications,
      statements
    },
    timezone: userTimezone
  };
};

module.exports = {
  getOverview,
  getValidTimezone,
  generateWeeklyBuckets,
  generateMonthlyBuckets,
  generateDailyBuckets
};
