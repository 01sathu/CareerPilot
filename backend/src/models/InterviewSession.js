const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['technical', 'hr', 'behavioral'],
    required: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  focusTopic: {
    type: String,
    default: '',
    trim: true
  },
  exampleAnswer: {
    type: String,
    default: null
  },
  userAnswer: {
    type: String,
    default: '',
    maxlength: 5000
  },
  isSkipped: {
    type: Boolean,
    default: false
  },
  revisit: {
    type: Boolean,
    default: false
  },
  feedback: {
    summary: { type: String, default: null },
    strengths: { type: [String], default: [] },
    areasToImprove: { type: [String], default: [] },
    ratings: {
      relevance: { type: Number, min: 1, max: 5, default: null },
      structure: { type: Number, min: 1, max: 5, default: null },
      clarity: { type: Number, min: 1, max: 5, default: null },
      specificity: { type: Number, min: 1, max: 5, default: null }
    },
    createdAt: { type: Date, default: null }
  }
});

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    roleTitle: {
      type: String,
      required: [true, 'Role title is required'],
      trim: true,
      maxlength: [120, 'Role title cannot exceed 120 characters']
    },
    experienceLevel: {
      type: String,
      enum: {
        values: ['fresher', 'junior', 'mid', 'senior', 'lead'],
        message: 'Invalid experience level: {VALUE}'
      },
      required: [true, 'Experience level is required']
    },
    questionTypes: {
      type: [String],
      enum: ['technical', 'hr', 'behavioral'],
      required: [true, 'At least one question type is required'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'At least one question type must be selected'
      }
    },
    mode: {
      type: String,
      enum: {
        values: ['practice', 'mock'],
        message: 'Invalid session mode: {VALUE}'
      },
      default: 'practice',
      required: true
    },
    status: {
      type: String,
      enum: {
        values: ['in_progress', 'completed'],
        message: 'Invalid session status: {VALUE}'
      },
      default: 'in_progress',
      required: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
      index: true
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
      index: true
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0
    },
    questions: {
      type: [questionSchema],
      default: []
    },
    summary: {
      totalQuestions: { type: Number, default: 0 },
      answeredCount: { type: Number, default: 0 },
      skippedCount: { type: Number, default: 0 },
      averageRatings: {
        relevance: { type: Number, default: 0 },
        structure: { type: Number, default: 0 },
        clarity: { type: Number, default: 0 },
        specificity: { type: Number, default: 0 },
        overall: { type: Number, default: 0 }
      },
      revisitCount: { type: Number, default: 0 },
      completedAt: { type: Date, default: null }
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimal queries (FR-078)
interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, mode: 1 });
interviewSessionSchema.index({ userId: 1, status: 1 });

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

module.exports = InterviewSession;
