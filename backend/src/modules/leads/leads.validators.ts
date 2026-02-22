import { z } from 'zod';

// ============================================================================
// LEADS - Add New Lead
// ============================================================================

export const createLeadSchema = z.object({
  body: z.object({
    // Basic Info
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    location: z.string().max(255).optional().nullable(),

    // Company Info
    companyName: z.string().max(255).default(''),
    jobTitle: z.string().max(100).optional().nullable(),
    website: z.string().url().optional().nullable().or(z.literal('')),

    // Lead Details
    leadSource: z.string().max(100).optional().nullable(),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
    temperature: z.enum(['COLD', 'WARM', 'HOT']).default('COLD'),
    potentialValue: z.number().min(0).optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
    tags: z.array(z.string()).default([]),
    notes: z.string().optional().nullable(),
  }),
});

export const updateLeadSchema = z.object({
  body: z.object({
    // Basic Info
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional().nullable(),
    location: z.string().max(255).optional().nullable(),

    // Company Info
    companyName: z.string().max(255).optional(),
    jobTitle: z.string().max(100).optional().nullable(),
    website: z.string().url().optional().nullable().or(z.literal('')),

    // Lead Details
    leadSource: z.string().max(100).optional().nullable(),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
    temperature: z.enum(['COLD', 'WARM', 'HOT']).optional(),
    potentialValue: z.number().min(0).optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional().nullable(),
  }),
});

export const leadQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
    temperature: z.enum(['COLD', 'WARM', 'HOT']).optional(),
    assignedTo: z.string().uuid().optional(),
    leadSource: z.string().optional(),
    sortBy: z.enum(['firstName', 'createdAt', 'potentialValue', 'companyName']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const leadIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const convertLeadSchema = z.object({
  body: z.object({
    createClient: z.boolean().default(true),
    clientType: z.enum(['BUSINESS', 'INDIVIDUAL']).default('BUSINESS'),
    createContact: z.boolean().default(false),
  }),
});

export const bulkAssignSchema = z.object({
  body: z.object({
    leadIds: z.array(z.string().uuid()).min(1),
    assignedToId: z.string().uuid(),
  }),
});

export const bulkStatusSchema = z.object({
  body: z.object({
    leadIds: z.array(z.string().uuid()).min(1),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']),
  }),
});

export const pipelineQuerySchema = z.object({
  query: z.object({
    assignedTo: z.string().uuid().optional(),
    temperature: z.enum(['COLD', 'WARM', 'HOT']).optional(),
    leadSource: z.string().optional(),
  }),
});