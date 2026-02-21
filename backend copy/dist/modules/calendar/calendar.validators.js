"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarEventIdSchema = exports.calendarEventQuerySchema = exports.updateCalendarEventSchema = exports.createCalendarEventSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// CALENDAR - Create Event
// ============================================================================
exports.createCalendarEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        eventTitle: zod_1.z.string().min(1).max(255),
        description: zod_1.z.string().optional().nullable(),
        isAllDay: zod_1.z.boolean().default(false),
        startDate: zod_1.z.string().datetime(),
        startTime: zod_1.z.string().max(10).optional().nullable(),
        endDate: zod_1.z.string().datetime(),
        endTime: zod_1.z.string().max(10).optional().nullable(),
        category: zod_1.z.enum(['WORK', 'MEETING', 'PERSONAL', 'DEADLINE', 'OTHER']).default('WORK'),
        color: zod_1.z.string().max(20).optional().nullable(),
        location: zod_1.z.string().max(255).optional().nullable(),
        meetingLink: zod_1.z.string().url().optional().nullable(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
        attendees: zod_1.z.array(zod_1.z.string()).default([]), // Can be userIds or emails
        isPrivate: zod_1.z.boolean().default(false),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.updateCalendarEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        eventTitle: zod_1.z.string().min(1).max(255).optional(),
        description: zod_1.z.string().optional().nullable(),
        isAllDay: zod_1.z.boolean().optional(),
        startDate: zod_1.z.string().datetime().optional(),
        startTime: zod_1.z.string().max(10).optional().nullable(),
        endDate: zod_1.z.string().datetime().optional(),
        endTime: zod_1.z.string().max(10).optional().nullable(),
        category: zod_1.z.enum(['WORK', 'MEETING', 'PERSONAL', 'DEADLINE', 'OTHER']).optional(),
        color: zod_1.z.string().max(20).optional().nullable(),
        location: zod_1.z.string().max(255).optional().nullable(),
        meetingLink: zod_1.z.string().url().optional().nullable(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
        attendees: zod_1.z.array(zod_1.z.string()).optional(),
        isPrivate: zod_1.z.boolean().optional(),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.calendarEventQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        category: zod_1.z.enum(['WORK', 'MEETING', 'PERSONAL', 'DEADLINE', 'OTHER']).optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
        sortBy: zod_1.z.enum(['startDate', 'eventTitle']).default('startDate'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
    }),
});
exports.calendarEventIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=calendar.validators.js.map