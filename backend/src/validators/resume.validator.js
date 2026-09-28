const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const jobMatchRequestSchema = z
  .object({
    applicationId: z
      .string()
      .regex(objectIdRegex, 'Invalid applicationId format')
      .optional(),
    jobDescription: z
      .string()
      .trim()
      .min(50, 'Job description must be at least 50 characters')
      .max(10000, 'Job description cannot exceed 10,000 characters')
      .optional()
  })
  .refine(
    (data) => Boolean(data.applicationId || data.jobDescription),
    'You must supply either an applicationId or pasted jobDescription text of 50-10,000 characters (FR-055)'
  );

module.exports = {
  jobMatchRequestSchema
};
