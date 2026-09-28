const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
      index: true
    },
    type: {
      type: String,
      enum: {
        values: ['interview', 'assessment', 'follow_up', 'other'],
        message: 'Invalid event type: {VALUE}'
      },
      required: [true, 'Event type is required']
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title must be at least 1 character long'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    startAt: {
      type: Date,
      required: [true, 'Start date and time is required'],
      index: true
    },
    endAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (val) {
          if (!val) return true;
          return val > this.startAt;
        },
        message: 'End date and time must be after start date and time (FR-090)'
      }
    },
    timezone: {
      type: String,
      required: [true, 'Timezone is required'],
      trim: true,
      default: 'UTC'
    },
    format: {
      type: String,
      enum: {
        values: ['video', 'phone', 'onsite'],
        message: 'Invalid format: {VALUE}'
      },
      default: null
    },
    locationOrLink: {
      type: String,
      maxlength: [2048, 'Location or link cannot exceed 2048 characters'],
      trim: true,
      default: ''
    },
    roundLabel: {
      type: String,
      maxlength: [120, 'Round label cannot exceed 120 characters'],
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'completed', 'cancelled'],
        message: 'Invalid status: {VALUE}'
      },
      default: 'scheduled',
      index: true
    },
    // Allowed offsets in minutes before startAt: 15 (15m), 60 (1h), 1440 (1d), 2880 (2d) (FR-097)
    reminderOffsets: {
      type: [Number],
      default: [1440, 60]
    },
    // Track sent reminders to prevent duplicate in-app alerts (FR-098, AC-F-02)
    remindersSent: [
      {
        offsetMinutes: { type: Number, required: true },
        sentAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimal queries (FR-094, FR-095, FR-149)
interviewSchema.index({ userId: 1, startAt: 1 });
interviewSchema.index({ userId: 1, status: 1 });
interviewSchema.index({ userId: 1, applicationId: 1 });

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;
