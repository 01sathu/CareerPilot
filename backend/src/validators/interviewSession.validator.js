const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createSessionSchema = z.object({
  roleTitle: z
    .string({ required_error: 'Role title is required' })
    .trim()
    .min(1, 'Role title cannot be empty')
    .max(120, 'Role title cannot exceed 120 characters'),
  experienceLevel: z.enum(['fresher', 'junior', 'mid', 'senior', 'lead'], {
    required_error: 'Experience level is required',
    invalid_type_error: 'Invalid experience level'
  }),
  questionTypes: z
    .array(z.enum(['technical', 'hr', 'behavioral']), {
      required_error: 'At least one question type is required'
    })
    .min(1, 'Select at least one question type')
    .max(3),
  count: z
    .number()
    .int()
    .min(5, 'Question count must be between 5 and 15')
    .max(15, 'Question count must be between 5 and 15')
    .default(10),
  mode: z.enum(['practice', 'mock']).default('practice'),
  applicationId: z
    .string()
    .regex(objectIdRegex, 'Invalid applicationId format')
    .nullable()
    .optional(),
  resumeId: z
    .string()
    .regex(objectIdRegex, 'Invalid resumeId format')
    .nullable()
    .optional()
});

const saveAnswerSchema = z.object({
  userAnswer: z
    .string()
    .max(5000, 'Answer cannot exceed 5000 characters')
    .optional(),
  isSkipped: z.boolean().optional(),
  revisit: z.boolean().optional(),
  currentQuestionIndex: z.number().int().min(0).optional()
});

const feedbackRequestSchema = z.object({
  userAnswer: z
    .string({ required_error: 'Answer is required for evaluation' })
    .trim()
    .min(20, 'Answer must be at least 20 characters long to receive AI feedback (FR-075)')
    .max(5000, 'Answer cannot exceed 5000 characters')
});

const listSessionsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  mode: z.enum(['practice', 'mock']).optional(),
  status: z.enum(['in_progress', 'completed']).optional()
});

module.exports = {
  createSessionSchema,
  saveAnswerSchema,
  feedbackRequestSchema,
  listSessionsQuerySchema
};
