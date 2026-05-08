import { z } from 'zod';

export const analyticsQuerySchema = z.object({
    query: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
        groupBy: z.enum(['status', 'source', 'assignee', 'date']).optional(),
        salesRepId: z.string().optional(),
        repId: z.string().optional(),
        leadSourceId: z.string().optional(),
        sourceId: z.string().optional(),
        dealStage: z.string().optional(),
        stage: z.string().optional(),
        plan: z.string().optional(),
        accountStatus: z.string().optional(),
    }).passthrough(),
});

export const reportTypeSchema = z.object({
    params: z.object({
        type: z.enum(['leads', 'clients', 'tasks', 'projects', 'revenue', 'expenses', 'overview']),
    }),
});
