"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingIdSchema = exports.bookingQuerySchema = exports.updateBookingSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
exports.createBookingSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(255),
        description: zod_1.z.string().optional().nullable(),
        startTime: zod_1.z.string().datetime(),
        endTime: zod_1.z.string().datetime(),
        status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).default('PENDING'),
        clientId: zod_1.z.string().uuid().optional().nullable(),
        assignedToId: zod_1.z.string().uuid().optional().nullable(),
        location: zod_1.z.string().max(255).optional().nullable(),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.updateBookingSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(255).optional(),
        description: zod_1.z.string().optional().nullable(),
        startTime: zod_1.z.string().datetime().optional(),
        endTime: zod_1.z.string().datetime().optional(),
        status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
        clientId: zod_1.z.string().uuid().optional().nullable(),
        assignedToId: zod_1.z.string().uuid().optional().nullable(),
        location: zod_1.z.string().max(255).optional().nullable(),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.bookingQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        status: zod_1.z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
        clientId: zod_1.z.string().uuid().optional(),
        assignedToId: zod_1.z.string().uuid().optional(),
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        sortBy: zod_1.z.enum(['startTime', 'createdAt', 'title']).default('startTime'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
    }),
});
exports.bookingIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=bookings.validators.js.map