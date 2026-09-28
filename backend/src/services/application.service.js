const Application = require('../models/Application');
const ApplicationHistory = require('../models/ApplicationHistory');
const Interview = require('../models/Interview');
const Notification = require('../models/Notification');
const notificationService = require('./notification.service');
const AppError = require('../utils/appError');
const csvService = require('./csv.service');

// Helper to escape regex special characters
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Create a new application (FR-024, FR-026, FR-030, FR-041)
 */
const createApplication = async (userId, data) => {
  const applicationData = {
    ...data,
    userId
  };

  // Default status is 'wishlist' if not provided
  if (!applicationData.status) {
    applicationData.status = 'wishlist';
  }

  // FR-030: When status first becomes 'applied' and appliedDate is empty, set to current date
  if (applicationData.status === 'applied' && !applicationData.appliedDate) {
    applicationData.appliedDate = new Date();
  }

  const application = new Application(applicationData);
  await application.save();

  // FR-041: Create initial history record
  await ApplicationHistory.create({
    applicationId: application._id,
    userId,
    eventType: 'created',
    fromStatus: null,
    toStatus: application.status,
    timestamp: application.createdAt,
    note: 'Application created'
  });

  return application;
};

/**
 * List applications with search, filtering, sorting, and pagination (FR-032 - FR-035)
 */
const listApplications = async (userId, query) => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    location,
    appliedFrom,
    appliedTo,
    sortBy = 'updatedAt',
    sortOrder = 'desc'
  } = query;

  // Base filter strictly scoped to the authenticated user (FR-149, FR-150)
  const filter = { userId };

  // Substring search on companyName, jobTitle, and location (FR-033)
  if (search && search.trim().length >= 2) {
    const cleanSearch = escapeRegex(search.trim());
    const searchRegex = new RegExp(cleanSearch, 'i');
    filter.$or = [
      { companyName: searchRegex },
      { jobTitle: searchRegex },
      { location: searchRegex }
    ];
  }

  // Status filtering (support comma-separated or single, FR-035)
  if (status) {
    const statusArray = status
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (statusArray.length > 0) {
      filter.status = { $in: statusArray };
    }
  }

  // Location filter
  if (location && location.trim().length > 0) {
    filter.location = new RegExp(escapeRegex(location.trim()), 'i');
  }

  // Applied date range filter
  if (appliedFrom || appliedTo) {
    filter.appliedDate = {};
    if (appliedFrom) {
      filter.appliedDate.$gte = new Date(appliedFrom);
    }
    if (appliedTo) {
      filter.appliedDate.$lte = new Date(appliedTo);
    }
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // Execute query and total count in parallel
  const [applications, total] = await Promise.all([
    Application.find(filter).sort(sort).skip(skip).limit(limit),
    Application.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    applications,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages
    }
  };
};

/**
 * Get single application by ID with chronological history timeline (FR-027, FR-042)
 */
const getApplicationById = async (userId, applicationId) => {
  const application = await Application.findOne({ _id: applicationId, userId });

  // FR-149: Resource existing for another user must return 404 NOT_FOUND
  if (!application) {
    throw new AppError('Application not found', 404, 'NOT_FOUND');
  }

  // Fetch chronological status history timeline (FR-042)
  const history = await ApplicationHistory.find({ applicationId, userId }).sort({
    timestamp: -1
  });

  return { application, history };
};

/**
 * Update an application with partial updates and status history logging (FR-028, FR-041, FR-113)
 */
const updateApplication = async (userId, applicationId, data) => {
  const application = await Application.findOne({ _id: applicationId, userId });

  if (!application) {
    throw new AppError('Application not found', 404, 'NOT_FOUND');
  }

  const oldStatus = application.status;
  const isStatusChanged = data.status && data.status !== oldStatus;
  const changedScalarFields = [];

  // Track changed scalar fields for FR-113
  const trackableFields = [
    'companyName',
    'jobTitle',
    'location',
    'applicationUrl',
    'appliedDate',
    'followUpDate',
    'deadlineDate'
  ];

  for (const field of trackableFields) {
    if (data[field] !== undefined && String(data[field]) !== String(application[field])) {
      changedScalarFields.push(field);
    }
  }

  // Apply updates
  Object.keys(data).forEach((key) => {
    if (key !== 'statusNote' && key !== '_id' && key !== 'userId') {
      application[key] = data[key];
    }
  });

  // FR-030: When status first becomes 'applied' and appliedDate is empty, set to current date
  if (isStatusChanged && data.status === 'applied' && !application.appliedDate) {
    application.appliedDate = new Date();
  }

  await application.save();

  // Record status change event (FR-041)
  if (isStatusChanged) {
    await ApplicationHistory.create({
      applicationId: application._id,
      userId,
      eventType: 'status_changed',
      fromStatus: oldStatus,
      toStatus: data.status,
      timestamp: new Date(),
      note: data.statusNote ? data.statusNote.trim().slice(0, 500) : ''
    });

    // Create in-app notification for status change (FR-106)
    try {
      await notificationService.createNotification(userId, {
        type: 'application_status_changed',
        title: `Status Changed: ${application.companyName}`,
        message: `Application for "${application.jobTitle}" moved from ${oldStatus} to ${data.status}.`,
        relatedEntityType: 'application',
        relatedEntityId: application._id,
        metadata: {
          applicationId: application._id,
          companyName: application.companyName,
          jobTitle: application.jobTitle,
          fromStatus: oldStatus,
          toStatus: data.status
        }
      });
    } catch (err) {
      // Non-blocking notification failure
      console.error('[Notification Error] Status change alert failed:', err.message);
    }
  } else if (changedScalarFields.length > 0) {
    // Record scalar update event (FR-113)
    await ApplicationHistory.create({
      applicationId: application._id,
      userId,
      eventType: 'updated',
      fromStatus: application.status,
      toStatus: application.status,
      changedFields: changedScalarFields,
      timestamp: new Date()
    });
  }

  return application;
};

/**
 * Delete an application and its history cascade (FR-029, AC-B-06)
 */
const deleteApplication = async (userId, applicationId) => {
  const application = await Application.findOne({ _id: applicationId, userId });

  if (!application) {
    throw new AppError('Application not found', 404, 'NOT_FOUND');
  }

  // Delete application record
  await Application.deleteOne({ _id: applicationId, userId });

  // Cascade delete application history (FR-029)
  await ApplicationHistory.deleteMany({ applicationId, userId });

  // Cascade delete linked interview calendar events (AC-B-06)
  await Interview.deleteMany({ applicationId, userId });

  // Cascade delete related notifications
  await Notification.deleteMany({ relatedEntityId: applicationId, userId });

  return { success: true };
};

/**
 * Export applications as CSV string with optional filtering (FR-117, FR-119, FR-120)
 */
const exportApplicationsCsv = async (userId, query = {}) => {
  const {
    search,
    status,
    location,
    appliedFrom,
    appliedTo,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  const filter = { userId };

  if (search && search.trim().length >= 2) {
    const cleanSearch = escapeRegex(search.trim());
    const searchRegex = new RegExp(cleanSearch, 'i');
    filter.$or = [
      { companyName: searchRegex },
      { jobTitle: searchRegex },
      { location: searchRegex }
    ];
  }

  if (status) {
    const statusArray = status
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (statusArray.length > 0) {
      filter.status = { $in: statusArray };
    }
  }

  if (location && location.trim().length > 0) {
    filter.location = new RegExp(escapeRegex(location.trim()), 'i');
  }

  if (appliedFrom || appliedTo) {
    filter.appliedDate = {};
    if (appliedFrom) {
      filter.appliedDate.$gte = new Date(appliedFrom);
    }
    if (appliedTo) {
      filter.appliedDate.$lte = new Date(appliedTo);
    }
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // Fetch applications for authenticated user without pagination limit (up to 5000 max for safety)
  const applications = await Application.find(filter).sort(sort).limit(5000);

  return csvService.generateApplicationsCsv(applications);
};

/**
 * Export application status history as CSV string (FR-118, FR-119)
 */
const exportHistoryCsv = async (userId) => {
  const history = await ApplicationHistory.find({ userId })
    .populate('applicationId', 'companyName jobTitle')
    .sort({ timestamp: -1 })
    .limit(10000);

  return csvService.generateHistoryCsv(history);
};

module.exports = {
  createApplication,
  listApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  exportApplicationsCsv,
  exportHistoryCsv
};

