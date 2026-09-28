const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['general', 'job_match'],
        message: 'Invalid analysis type: {VALUE}'
      },
      required: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null
    },
    jobTitle: {
      type: String,
      default: ''
    },
    companyName: {
      type: String,
      default: ''
    },
    // General Analysis fields (FR-054)
    general: {
      categorizedSkills: {
        technical: { type: [String], default: [] },
        tools: { type: [String], default: [] },
        soft: { type: [String], default: [] }
      },
      education: [
        {
          degree: { type: String, default: '' },
          institution: { type: String, default: '' },
          graduationYear: { type: String, default: '' },
          fieldOfStudy: { type: String, default: '' }
        }
      ],
      experienceSummary: [
        {
          role: { type: String, default: '' },
          organization: { type: String, default: '' },
          duration: { type: String, default: '' },
          description: { type: String, default: '' }
        }
      ],
      estimatedYearsExperience: {
        type: Number,
        default: 0
      },
      structureFeedback: {
        strengths: { type: [String], default: [] },
        improvements: { type: [String], default: [] },
        formattingNotes: { type: String, default: '' }
      }
    },
    // Job Match Analysis fields (FR-056, FR-057, FR-058)
    jobMatch: {
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
      },
      componentScores: {
        skills: {
          score: { type: Number, default: 0 },
          rationale: { type: String, default: '' }
        },
        experience: {
          score: { type: Number, default: 0 },
          rationale: { type: String, default: '' }
        },
        education: {
          score: { type: Number, default: 0 },
          rationale: { type: String, default: '' }
        },
        keywords: {
          score: { type: Number, default: 0 },
          rationale: { type: String, default: '' }
        }
      },
      matchedSkills: {
        type: [String],
        default: []
      },
      missingSkills: [
        {
          skill: { type: String, required: true },
          category: {
            type: String,
            enum: ['required', 'preferred'],
            default: 'preferred'
          }
        }
      ],
      improvementSuggestions: [
        {
          priority: { type: Number, default: 1 },
          text: { type: String, required: true },
          type: { type: String, default: 'clarification' }
        }
      ]
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Resume must be associated with a user'],
      index: true
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      maxlength: [255, 'Filename cannot exceed 255 characters'],
      trim: true
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      unique: true
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      max: [5 * 1024 * 1024, 'File size cannot exceed 5 MB'] // FR-046
    },
    pageCount: {
      type: Number,
      required: [true, 'Page count is required'],
      max: [10, 'Resume cannot exceed 10 pages'] // FR-047
    },
    extractedText: {
      type: String,
      maxlength: [50000, 'Extracted text cannot exceed 50,000 characters'], // FR-049
      default: ''
    },
    extractionStatus: {
      type: String,
      enum: {
        values: ['success', 'failed'],
        message: 'Invalid extraction status: {VALUE}'
      },
      default: 'success'
    },
    extractionErrorMessage: {
      type: String,
      default: ''
    },
    // Embedded analyses, keeping up to 20 most recent (FR-062)
    analyses: {
      type: [analysisSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user query sorting (FR-051)
resumeSchema.index({ userId: 1, createdAt: -1 });

// Helper to keep at most 20 most recent analyses per resume (FR-062)
resumeSchema.methods.addAnalysis = function (analysisData) {
  this.analyses.unshift(analysisData);
  if (this.analyses.length > 20) {
    this.analyses = this.analyses.slice(0, 20);
  }
};

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
