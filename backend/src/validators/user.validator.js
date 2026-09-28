const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(80, 'Name cannot exceed 80 characters')
    .optional(),
  headline: z
    .string()
    .max(120, 'Headline cannot exceed 120 characters')
    .optional(),
  experienceLevel: z
    .enum(['fresher', 'junior', 'mid', 'senior', 'lead'], {
      errorMap: () => ({ message: 'Invalid experience level' })
    })
    .optional(),
  skills: z
    .array(z.string().trim().max(40, 'Skill name cannot exceed 40 characters'))
    .max(50, 'You can add at most 50 skills')
    .optional(),
  targetRoles: z
    .array(z.string().trim().max(80, 'Target role cannot exceed 80 characters'))
    .max(10, 'You can add at most 10 target roles')
    .optional(),
  preferredLocations: z
    .array(z.string().trim().max(80, 'Location cannot exceed 80 characters'))
    .max(10, 'You can add at most 10 preferred locations')
    .optional(),
  openToRemote: z.boolean().optional(),
  timezone: z.string().trim().optional(),
  aiConsent: z.boolean().optional(),
  notificationPreferences: z
    .object({
      interview_reminder: z.boolean().optional(),
      follow_up_reminder: z.boolean().optional(),
      application_status_changed: z.boolean().optional()
    })
    .optional()
});

const deleteAccountSchema = z.object({
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'You must type "DELETE" in uppercase to confirm account deletion' })
  })
});

module.exports = {
  updateProfileSchema,
  deleteAccountSchema
};
