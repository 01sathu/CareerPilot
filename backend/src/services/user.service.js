const User = require('../models/User');
const Application = require('../models/Application');
const ApplicationHistory = require('../models/ApplicationHistory');
const Resume = require('../models/Resume');
const Interview = require('../models/Interview');
const Notification = require('../models/Notification');
const InterviewSession = require('../models/InterviewSession');
const storageService = require('./storage.service');
const AppError = require('../utils/appError');

/**
 * Get user profile by ID (FR-017)
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user.toSafeObject();
};

/**
 * Update user profile (FR-018 - FR-022)
 */
const updateUserProfile = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (data.name !== undefined) user.name = data.name.trim();
  if (data.headline !== undefined) user.headline = data.headline.trim();
  if (data.experienceLevel !== undefined) user.experienceLevel = data.experienceLevel;
  if (data.openToRemote !== undefined) user.openToRemote = data.openToRemote;
  if (data.timezone !== undefined) user.timezone = data.timezone.trim();

  // Deduplicate skills case-insensitively and trim (FR-019)
  if (data.skills !== undefined) {
    const seen = new Set();
    const cleanSkills = [];
    for (const skill of data.skills) {
      const trimmed = skill.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed.length > 0 && !seen.has(lower)) {
        seen.add(lower);
        cleanSkills.push(trimmed.slice(0, 40));
      }
    }
    if (cleanSkills.length > 50) {
      throw new AppError('Skills cannot exceed 50 items', 400, 'VALIDATION_ERROR', [
        { field: 'skills', message: 'You can specify at most 50 skills' }
      ]);
    }
    user.skills = cleanSkills;
  }

  // Target roles (FR-021)
  if (data.targetRoles !== undefined) {
    user.targetRoles = data.targetRoles.map((r) => r.trim().slice(0, 80)).slice(0, 10);
  }

  // Preferred locations (FR-021)
  if (data.preferredLocations !== undefined) {
    user.preferredLocations = data.preferredLocations.map((l) => l.trim().slice(0, 80)).slice(0, 10);
  }

  // AI consent acknowledgement (FR-063)
  if (data.aiConsent === true && !user.aiConsentAcceptedAt) {
    user.aiConsentAcceptedAt = new Date();
  }

  // Notification preferences (FR-111)
  if (data.notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...data.notificationPreferences
    };
  }

  await user.save();
  return user.toSafeObject();
};

/**
 * Record AI consent acceptance (FR-063)
 */
const acceptAiConsent = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  user.aiConsentAcceptedAt = new Date();
  await user.save();
  return user.toSafeObject();
};

/**
 * Permanently delete user account and cascade delete all associated data (FR-121, FR-122, FR-123)
 * @param {string} userId - User ID
 * @param {string} password - User password for re-authentication
 * @param {string} confirmation - Must be 'DELETE'
 */
const deleteUserAccount = async (userId, password, confirmation) => {
  if (confirmation !== 'DELETE') {
    throw new AppError('Confirmation must be "DELETE"', 400, 'VALIDATION_ERROR', [
      { field: 'confirmation', message: 'You must type "DELETE" in uppercase to confirm account deletion' }
    ]);
  }

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new AppError('Incorrect password. Account deletion aborted.', 401, 'INVALID_CREDENTIALS');
  }

  // FR-122: Delete stored physical files for this user
  try {
    const resumes = await Resume.find({ userId });
    for (const resume of resumes) {
      if (resume.storageKey) {
        try {
          await storageService.deleteFile(resume.storageKey);
        } catch (err) {
          // Log without personal content per FR-122 and NFR-SEC-12
          console.error(`[AccountDeletion] Storage deletion failed for key ${resume.storageKey}: ${err.message}`);
        }
      }
    }
    await storageService.deleteUserDirectory(userId);
  } catch (fileErr) {
    console.error(`[AccountDeletion] Resume query or storage cleanup failed: ${fileErr.message}`);
  }

  // FR-121: Cascading deletion across all collections
  await Promise.all([
    ApplicationHistory.deleteMany({ userId }),
    Application.deleteMany({ userId }),
    Resume.deleteMany({ userId }),
    Interview.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    InterviewSession.deleteMany({ userId })
  ]);

  // Finally delete the user document
  await User.deleteOne({ _id: userId });

  return {
    success: true,
    message: 'Account and all associated data permanently deleted.'
  };
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  acceptAiConsent,
  deleteUserAccount
};
