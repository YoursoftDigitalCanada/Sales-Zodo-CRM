import { z } from 'zod';

export const createLeadSourceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateLeadSourceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const leadSourceQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    search: z.string().optional(),
    isActive: z.string().optional().transform((val) => 
      val === 'true' ? true : val === 'false' ? false : undefined
    ),
  }),
});

export const leadSourceIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lead source ID'),
  }),
});

export type CreateLeadSourceInput = z.infer<typeof createLeadSourceSchema>['body'];
export type UpdateLeadSourceInput = z.infer<typeof updateLeadSourceSchema>['body'];
export type LeadSourceQueryInput = z.infer<typeof leadSourceQuerySchema>['query'];