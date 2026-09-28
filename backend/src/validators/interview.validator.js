const { z } = require('zod');

const eventTypeEnum = z.enum(['interview', 'assessment', 'follow_up', 'other']);
const eventFormatEnum = z.enum(['video', 'phone', 'onsite']);
const eventStatusEnum = z.enum(['scheduled', 'completed', 'cancelled']);

// Allowed reminder offsets in minutes (15 min, 1 hr, 1 day, 2 days) per FR-097
const allowedOffsets = [15, 60, 1440, 2880];

const createInterviewSchema = z
  .object({
    applicationId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID format')
      .nullable()
      .optional(),
    type: eventTypeEnum,
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title cannot be empty')
      .max(120, 'Title cannot exceed 120 characters'),
    startAt: z
      .string({ required_error: 'Start date and time is required' })
      .datetime({ message: 'Start date must be a valid ISO 8601 string' }),
    endAt: z
      .string()
      .datetime({ message: 'End date must be a valid ISO 8601 string' })
      .nullable()
      .optional(),
    timezone: z.string().trim().min(1, 'Timezone is required').default('UTC').optional(),
    format: eventFormatEnum.nullable().optional(),
    locationOrLink: z
      .string()
      .trim()
      .max(2048, 'Location or link cannot exceed 2048 characters')
      .default('')
      .optional(),
    roundLabel: z
      .string()
      .trim()
      .max(120, 'Round label cannot exceed 120 characters')
      .default('')
      .optional(),
    notes: z
      .string()
      .max(2000, 'Notes cannot exceed 2000 characters')
      .default('')
      .optional(),
    reminderOffsets: z
      .array(z.number().refine((val) => allowedOffsets.includes(val), {
        message: 'Reminder offset must be 15, 60, 1440, or 2880 minutes'
      }))
      .default([1440, 60])
      .optional()
  })
  .refine(
    (data) => {
      if (data.endAt && data.startAt) {
        return new Date(data.endAt) > new Date(data.startAt);
      }
      return true;
    },
    {
      message: 'End date and time must be after start date and time (FR-090)',
      path: ['endAt']
    }
  );

const updateInterviewSchema = z
  .object({
    applicationId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID format')
      .nullable()
      .optional(),
    type: eventTypeEnum.optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(120, 'Title cannot exceed 120 characters')
      .optional(),
    startAt: z
      .string()
      .datetime({ message: 'Start date must be a valid ISO 8601 string' })
      .optional(),
    endAt: z
      .string()
      .datetime({ message: 'End date must be a valid ISO 8601 string' })
      .nullable()
      .optional(),
    timezone: z.string().trim().min(1).optional(),
    format: eventFormatEnum.nullable().optional(),
    locationOrLink: z
      .string()
      .trim()
      .max(2048, 'Location or link cannot exceed 2048 characters')
      .optional(),
    roundLabel: z
      .string()
      .trim()
      .max(120, 'Round label cannot exceed 120 characters')
      .optional(),
    notes: z
      .string()
      .max(2000, 'Notes cannot exceed 2000 characters')
      .optional(),
    status: eventStatusEnum.optional(),
    reminderOffsets: z
      .array(z.number().refine((val) => allowedOffsets.includes(val), {
        message: 'Reminder offset must be 15, 60, 1440, or 2880 minutes'
      }))
      .optional()
  })
  .refine(
    (data) => {
      if (data.endAt && data.startAt) {
        return new Date(data.endAt) > new Date(data.startAt);
      }
      return true;
    },
    {
      message: 'End date and time must be after start date and time (FR-090)',
      path: ['endAt']
    }
  );

const listInterviewsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: eventStatusEnum.optional(),
  type: eventTypeEnum.optional(),
  applicationId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID format')
    .optional()
});

module.exports = {
  createInterviewSchema,
  updateInterviewSchema,
  listInterviewsQuerySchema
};
