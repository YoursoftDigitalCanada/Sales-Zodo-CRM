import { z } from 'zod';

// ============================================================================
// CALENDAR - Create Event
// ============================================================================

export const createCalendarEventSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        isAllDay: z.boolean().default(false),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        eventType: z.enum(['MEETING', 'TASK', 'REMINDER', 'EVENT', 'HOLIDAY', 'PERSONAL', 'OTHER']).default('MEETING'),
        category: z.string().max(50).optional().nullable(),
        color: z.string().max(20).optional().nullable(),
        location: z.string().max(255).optional().nullable(),
        meetingLink: z.string().max(500).optional().nullable(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
        isPrivate: z.boolean().default(false),
        notes: z.string().optional().nullable(),
        timezone: z.string().max(50).optional().default('UTC'),
        recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']).optional().default('NONE'),
        recurrenceRule: z.string().optional().nullable(),
        recurrenceEndDate: z.string().datetime().optional().nullable(),
        reminderMinutes: z.number().int().optional().nullable(),
        attendeeIds: z.array(z.string()).default([]),
    }),
});

export const updateCalendarEventSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        isAllDay: z.boolean().optional(),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        eventType: z.enum(['MEETING', 'TASK', 'REMINDER', 'EVENT', 'HOLIDAY', 'PERSONAL', 'OTHER']).optional(),
        category: z.string().max(50).optional().nullable(),
        color: z.string().max(20).optional().nullable(),
        location: z.string().max(255).optional().nullable(),
        meetingLink: z.string().max(500).optional().nullable(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
        isPrivate: z.boolean().optional(),
        notes: z.string().optional().nullable(),
        timezone: z.string().max(50).optional(),
        recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']).optional(),
        recurrenceRule: z.string().optional().nullable(),
        recurrenceEndDate: z.string().datetime().optional().nullable(),
        reminderMinutes: z.number().int().optional().nullable(),
        attendeeIds: z.array(z.string()).optional(),
    }),
});

export const calendarEventQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        eventType: z.enum(['MEETING', 'TASK', 'REMINDER', 'EVENT', 'HOLIDAY', 'PERSONAL', 'OTHER']).optional(),
        category: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
        sortBy: z.enum(['startTime', 'title', 'createdAt']).default('startTime'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }),
});

export const calendarEventIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
