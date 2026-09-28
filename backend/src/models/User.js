const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Excluded by default from normal queries (FR-004, FR-134)
    },
    headline: {
      type: String,
      maxlength: [120, 'Headline cannot exceed 120 characters'],
      default: ''
    },
    experienceLevel: {
      type: String,
      enum: {
        values: ['fresher', 'junior', 'mid', 'senior', 'lead'],
        message: 'Invalid experience level: {VALUE}'
      },
      default: 'fresher'
    },
    skills: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [40, 'Each skill cannot exceed 40 characters']
        }
      ],
      validate: {
        validator: function (skills) {
          return !skills || skills.length <= 50;
        },
        message: 'You can specify at most 50 skills'
      },
      default: []
    },
    targetRoles: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [80, 'Each target role cannot exceed 80 characters']
        }
      ],
      validate: {
        validator: function (roles) {
          return !roles || roles.length <= 10;
        },
        message: 'You can specify at most 10 target roles'
      },
      default: []
    },
    preferredLocations: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [80, 'Each preferred location cannot exceed 80 characters']
        }
      ],
      validate: {
        validator: function (locations) {
          return !locations || locations.length <= 10;
        },
        message: 'You can specify at most 10 preferred locations'
      },
      default: []
    },
    openToRemote: {
      type: Boolean,
      default: false
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        family: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        isRevoked: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    passwordResetTokenHash: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    aiConsentAcceptedAt: {
      type: Date,
      default: null
    },
    notificationPreferences: {
      interview_reminder: { type: Boolean, default: true },
      follow_up_reminder: { type: Boolean, default: true },
      application_status_changed: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true
  }
);

// Pre/post hooks or custom schema configurations can be added here

/**
 * Compare plain text password against stored bcrypt hash (FR-004)
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Static helper to hash password with cost factor >= 12 (FR-004)
 */
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
};

/**
 * Generate cryptographically random single-use password reset token (FR-015)
 * Returns the unhashed token to send to the user, while saving the hash in the DB.
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
  return resetToken;
};

/**
 * Strips sensitive data, returning a clean user object for API responses (FR-134)
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  delete obj.passwordResetTokenHash;
  delete obj.passwordResetExpires;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
