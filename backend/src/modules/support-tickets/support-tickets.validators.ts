import { z } from 'zod';

export const ticketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']);
export const ticketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const supportTicketIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket id'),
  }),
});

export const supportTicketQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: ticketStatusSchema.or(z.literal('ALL')).optional(),
    priority: ticketPrioritySchema.or(z.literal('ALL')).optional(),
    assignee: z.string().max(255).optional(),
    search: z.string().max(255).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const createSupportTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(3).max(255),
    description: z.string().min(10).max(10000),
    priority: ticketPrioritySchema.optional(),
    category: z.string().min(2).max(100).optional(),
  }),
});

export const updateSupportTicketStatusSchema = z.object({
  body: z.object({
    status: ticketStatusSchema,
  }),
});

export const assignSupportTicketSchema = z.object({
  body: z.object({
    assignee: z.string().email().optional().nullable().or(z.literal('')),
  }),
});

export const addSupportTicketMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(10000),
    isInternal: z.boolean().optional(),
  }),
});
