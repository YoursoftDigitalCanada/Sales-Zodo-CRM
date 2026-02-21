import { z } from 'zod';

export const createBookingSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).default('PENDING'),
        clientId: z.string().uuid().optional().nullable(),
        assignedToId: z.string().uuid().optional().nullable(),
        location: z.string().max(255).optional().nullable(),
        notes: z.string().optional().nullable(),
    }),
});

export const updateBookingSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
        clientId: z.string().uuid().optional().nullable(),
        assignedToId: z.string().uuid().optional().nullable(),
        location: z.string().max(255).optional().nullable(),
        notes: z.string().optional().nullable(),
    }),
});

export const bookingQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
        clientId: z.string().uuid().optional(),
        assignedToId: z.string().uuid().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        sortBy: z.enum(['startTime', 'createdAt', 'title']).default('startTime'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }),
});

export const bookingIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
