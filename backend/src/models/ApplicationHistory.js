const mongoose = require('mongoose');

const applicationHistorySchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'History must be associated with an application'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'History must be associated with a user'],
      index: true
    },
    eventType: {
      type: String,
      enum: {
        values: ['created', 'status_changed', 'updated'],
        message: 'Invalid history event type: {VALUE}'
      },
      required: true
    },
    fromStatus: {
      type: String,
      enum: ['wishlist', 'applied', 'assessment', 'interview', 'offer', 'rejected', null],
      default: null
    },
    toStatus: {
      type: String,
      enum: ['wishlist', 'applied', 'assessment', 'interview', 'offer', 'rejected', null],
      default: null
    },
    changedFields: {
      type: [String],
      default: []
    },
    note: {
      type: String,
      maxlength: [500, 'History note cannot exceed 500 characters'],
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Compound indexes for timeline retrieval and user feed (FR-042, FR-114)
applicationHistorySchema.index({ applicationId: 1, timestamp: -1 });
applicationHistorySchema.index({ userId: 1, timestamp: -1 });

const ApplicationHistory = mongoose.model('ApplicationHistory', applicationHistorySchema);

module.exports = ApplicationHistory;
