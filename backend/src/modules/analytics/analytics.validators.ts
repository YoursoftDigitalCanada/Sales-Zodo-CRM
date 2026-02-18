import { z } from 'zod';

export const analyticsQuerySchema = z.object({
    query: z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
        groupBy: z.enum(['status', 'source', 'assignee', 'date']).optional(),
    }),
});

export const reportTypeSchema = z.object({
    params: z.object({
        type: z.enum(['leads', 'clients', 'tasks', 'projects', 'revenue', 'expenses', 'overview']),
    }),
});
