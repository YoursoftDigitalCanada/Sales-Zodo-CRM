import { z } from 'zod';

// ── Enums (must match Prisma) ──────────────────────────────────────
const sourceTypeEnum = z.enum([
  'COLD_CALL', 'EMAIL_CAMPAIGN', 'GOOGLE_ADS', 'REFERRAL',
  'SOCIAL_MEDIA', 'TRADE_SHOW', 'WALK_IN', 'WEBSITE',
]);
const categoryEnum = z.enum(['DIGITAL', 'MANUAL']);
const integrationStatusEnum = z.enum(['DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR', 'EXPIRED']);
const assignmentMethodEnum = z.enum(['MANUAL_ASSIGN', 'ROUND_ROBIN', 'TERRITORY', 'LOAD_BALANCE', 'FIRST_AVAILABLE']);
const statusEnum = z.enum(['ACTIVE', 'INACTIVE', 'PAUSED', 'ARCHIVED']);

// ── Create ──────────────────────────────────────────────────────────
export const createLeadSourceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional().default(true),

    // Type & Category
    sourceType: sourceTypeEnum.optional().default('WEBSITE'),
    category: categoryEnum.optional().default('DIGITAL'),
    icon: z.string().max(50).optional().nullable(),
    color: z.string().max(20).optional().nullable(),

    // Integration
    integrationStatus: integrationStatusEnum.optional().default('DISCONNECTED'),
    integrationConfig: z.any().optional().nullable(),
    apiEndpoint: z.string().url().optional().nullable(),

    // Cost
    costPerLead: z.number().min(0).optional().nullable(),
    monthlyBudget: z.number().min(0).optional().nullable(),

    // Assignment
    autoAssign: z.boolean().optional().default(false),
    assignmentMethod: assignmentMethodEnum.optional().default('MANUAL_ASSIGN'),
    assignedUserId: z.string().uuid().optional().nullable(),
    assignedTeamId: z.string().uuid().optional().nullable(),
    territoryRules: z.any().optional().nullable(),

    // Automation
    sendWelcomeEmail: z.boolean().optional().default(false),
    sendWelcomeSms: z.boolean().optional().default(false),
    createFollowupTask: z.boolean().optional().default(true),
    followupDelayMinutes: z.number().int().min(0).max(10080).optional().default(30),
    notifyAssignee: z.boolean().optional().default(true),
    notificationChannels: z.array(z.string()).optional().default(['email', 'in_app']),

    // Field Mapping
    fieldMapping: z.any().optional().nullable(),
    defaultValues: z.any().optional().nullable(),

    // Status
    status: statusEnum.optional().default('ACTIVE'),
  }).passthrough(),
}).passthrough();

// ── Update ──────────────────────────────────────────────────────────
export const updateLeadSourceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional(),

    sourceType: sourceTypeEnum.optional(),
    category: categoryEnum.optional(),
    icon: z.string().max(50).optional().nullable(),
    color: z.string().max(20).optional().nullable(),

    integrationStatus: integrationStatusEnum.optional(),
    integrationConfig: z.any().optional().nullable(),
    apiEndpoint: z.string().url().optional().nullable(),

    costPerLead: z.number().min(0).optional().nullable(),
    monthlyBudget: z.number().min(0).optional().nullable(),

    autoAssign: z.boolean().optional(),
    assignmentMethod: assignmentMethodEnum.optional(),
    assignedUserId: z.string().uuid().optional().nullable(),
    assignedTeamId: z.string().uuid().optional().nullable(),
    territoryRules: z.any().optional().nullable(),

    sendWelcomeEmail: z.boolean().optional(),
    sendWelcomeSms: z.boolean().optional(),
    createFollowupTask: z.boolean().optional(),
    followupDelayMinutes: z.number().int().min(0).max(10080).optional(),
    notifyAssignee: z.boolean().optional(),
    notificationChannels: z.array(z.string()).optional(),

    fieldMapping: z.any().optional().nullable(),
    defaultValues: z.any().optional().nullable(),

    status: statusEnum.optional(),
  }).passthrough(),
}).passthrough();

// ── Query ───────────────────────────────────────────────────────────
export const leadSourceQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    search: z.string().optional(),
    isActive: z.string().optional().transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined
    ),
    sourceType: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    integrationStatus: z.string().optional(),
  }),
});

// ── ID ──────────────────────────────────────────────────────────────
export const leadSourceIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lead source ID'),
  }),
}).passthrough();

// ── Log Query ───────────────────────────────────────────────────────
export const leadSourceLogQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    eventType: z.string().optional(),
    status: z.string().optional(),
  }),
});

// ── Types ───────────────────────────────────────────────────────────
export type CreateLeadSourceInput = z.infer<typeof createLeadSourceSchema>['body'];
export type UpdateLeadSourceInput = z.infer<typeof updateLeadSourceSchema>['body'];
export type LeadSourceQueryInput = z.infer<typeof leadSourceQuerySchema>['query'];
export type LeadSourceLogQueryInput = z.infer<typeof leadSourceLogQuerySchema>['query'];