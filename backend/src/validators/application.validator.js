const { z } = require('zod');

const statusEnum = z.enum(['wishlist', 'applied', 'assessment', 'interview', 'offer', 'rejected']);

const salarySchema = z
  .object({
    min: z.number().nonnegative('Minimum salary cannot be negative').nullable().optional(),
    max: z.number().nonnegative('Maximum salary cannot be negative').nullable().optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code')
      .default('USD')
      .optional(),
    period: z.enum(['yearly', 'monthly', 'hourly']).default('yearly').optional()
  })
  .refine(
    (data) => {
      if (data.min !== null && data.min !== undefined && data.max !== null && data.max !== undefined) {
        return data.min <= data.max;
      }
      return true;
    },
    {
      message: 'Minimum salary cannot exceed maximum salary',
      path: ['min']
    }
  );

const createApplicationSchema = z.object({
  companyName: z
    .string({ required_error: 'Company name is required' })
    .trim()
    .min(1, 'Company name cannot be empty')
    .max(120, 'Company name cannot exceed 120 characters'),
  jobTitle: z
    .string({ required_error: 'Job title is required' })
    .trim()
    .min(1, 'Job title cannot be empty')
    .max(120, 'Job title cannot exceed 120 characters'),
  location: z
    .string()
    .trim()
    .max(120, 'Location cannot exceed 120 characters')
    .optional()
    .default(''),
  status: statusEnum.default('wishlist').optional(),
  salary: salarySchema.optional(),
  jobDescription: z
    .string()
    .max(10000, 'Job description cannot exceed 10,000 characters')
    .optional()
    .default(''),
  applicationUrl: z
    .string()
    .trim()
    .max(2048, 'Application URL cannot exceed 2,048 characters')
    .refine(
      (val) => !val || /^https?:\/\/.+/i.test(val),
      'Application URL must be a valid http or https URL'
    )
    .optional()
    .default(''),
  notes: z
    .string()
    .max(5000, 'Notes cannot exceed 5,000 characters')
    .optional()
    .default(''),
  appliedDate: z.string().datetime({ offset: true }).nullable().optional(),
  followUpDate: z.string().datetime({ offset: true }).nullable().optional(),
  deadlineDate: z.string().datetime({ offset: true }).nullable().optional()
});

const updateApplicationSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, 'Company name cannot be empty')
    .max(120, 'Company name cannot exceed 120 characters')
    .optional(),
  jobTitle: z
    .string()
    .trim()
    .min(1, 'Job title cannot be empty')
    .max(120, 'Job title cannot exceed 120 characters')
    .optional(),
  location: z
    .string()
    .trim()
    .max(120, 'Location cannot exceed 120 characters')
    .optional(),
  status: statusEnum.optional(),
  salary: salarySchema.optional(),
  jobDescription: z
    .string()
    .max(10000, 'Job description cannot exceed 10,000 characters')
    .optional(),
  applicationUrl: z
    .string()
    .trim()
    .max(2048, 'Application URL cannot exceed 2,048 characters')
    .refine(
      (val) => !val || /^https?:\/\/.+/i.test(val),
      'Application URL must be a valid http or https URL'
    )
    .optional(),
  notes: z
    .string()
    .max(5000, 'Notes cannot exceed 5,000 characters')
    .optional(),
  appliedDate: z.string().datetime({ offset: true }).nullable().optional(),
  followUpDate: z.string().datetime({ offset: true }).nullable().optional(),
  deadlineDate: z.string().datetime({ offset: true }).nullable().optional(),
  statusNote: z
    .string()
    .max(500, 'Status note cannot exceed 500 characters')
    .optional()
});

const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  location: z.string().trim().optional(),
  appliedFrom: z.string().datetime({ offset: true }).optional(),
  appliedTo: z.string().datetime({ offset: true }).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'companyName', 'jobTitle', 'appliedDate', 'status'])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const exportApplicationsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  location: z.string().trim().optional(),
  appliedFrom: z.string().datetime({ offset: true }).optional(),
  appliedTo: z.string().datetime({ offset: true }).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'companyName', 'jobTitle', 'appliedDate', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

module.exports = {
  createApplicationSchema,
  updateApplicationSchema,
  listApplicationsQuerySchema,
  exportApplicationsQuerySchema
};

