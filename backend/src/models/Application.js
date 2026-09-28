const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Application must belong to a user'],
      index: true
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [1, 'Company name cannot be empty'],
      maxlength: [120, 'Company name cannot exceed 120 characters']
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [1, 'Job title cannot be empty'],
      maxlength: [120, 'Job title cannot exceed 120 characters']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [120, 'Location cannot exceed 120 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['wishlist', 'applied', 'assessment', 'interview', 'offer', 'rejected'],
        message: 'Invalid application status: {VALUE}'
      },
      default: 'wishlist'
    },
    salary: {
      min: {
        type: Number,
        min: [0, 'Minimum salary cannot be negative'],
        default: null
      },
      max: {
        type: Number,
        min: [0, 'Maximum salary cannot be negative'],
        default: null
      },
      currency: {
        type: String,
        uppercase: true,
        trim: true,
        match: [/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code'],
        default: 'USD'
      },
      period: {
        type: String,
        enum: {
          values: ['yearly', 'monthly', 'hourly'],
          message: 'Period must be yearly, monthly, or hourly'
        },
        default: 'yearly'
      }
    },
    jobDescription: {
      type: String,
      maxlength: [10000, 'Job description cannot exceed 10,000 characters'],
      default: ''
    },
    applicationUrl: {
      type: String,
      trim: true,
      maxlength: [2048, 'Application URL cannot exceed 2,048 characters'],
      default: ''
    },
    notes: {
      type: String,
      maxlength: [5000, 'Notes cannot exceed 5,000 characters'],
      default: ''
    },
    appliedDate: {
      type: Date,
      default: null
    },
    followUpDate: {
      type: Date,
      default: null
    },
    deadlineDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for performant querying, sorting, and user-scoping (FR-149, NFR-PERF-01)
applicationSchema.index({ userId: 1, updatedAt: -1 });
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, companyName: 1 });
applicationSchema.index({ userId: 1, appliedDate: -1 });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
