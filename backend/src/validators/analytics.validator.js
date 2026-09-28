const { z } = require('zod');

// Schema for GET /api/v1/analytics/overview query parameters (FR-083, FR-086, FR-129)
const analyticsOverviewQuerySchema = z.object({
  range: z
    .enum(['30d', '90d', '12w', '12m'])
    .optional(),
  timezone: z
    .string()
    .max(60, 'Timezone identifier cannot exceed 60 characters')
    .optional()
}).strict(); // Reject unexpected query parameters

module.exports = {
  analyticsOverviewQuerySchema
};
