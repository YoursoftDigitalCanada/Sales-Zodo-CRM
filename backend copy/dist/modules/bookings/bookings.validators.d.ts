import { z } from 'zod';
export declare const createBookingSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        startTime: z.ZodString;
        endTime: z.ZodString;
        status: z.ZodDefault<z.ZodEnum<["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        assignedToId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED";
        title: string;
        startTime: string;
        endTime: string;
        description?: string | null | undefined;
        location?: string | null | undefined;
        assignedToId?: string | null | undefined;
        notes?: string | null | undefined;
        clientId?: string | null | undefined;
    }, {
        title: string;
        startTime: string;
        endTime: string;
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        description?: string | null | undefined;
        location?: string | null | undefined;
        assignedToId?: string | null | undefined;
        notes?: string | null | undefined;
        clientId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED";
        title: string;
        startTime: string;
        endTime: string;
        description?: string | null | undefined;
        location?: string | null | undefined;
        assignedToId?: string | null | undefined;
        notes?: string | null | undefined;
        clientId?: string | null | undefined;
    };
}, {
    body: {
        title: string;
        startTime: string;
        endTime: string;
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        description?: string | null | undefined;
        location?: string | null | undefined;
        assignedToId?: string | null | undefined;
        notes?: string | null | undefined;
        clientId?: string | null | undefined;
    };
}>;
export declare const updateBookingSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        startTime: z.ZodOptional<z.ZodString>;
        endTime: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        assignedToId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        description?: string | null | undefined;
        location?: string | null | undefined;
        assignedToId?: string | null | undefined;
        notes?: string | null | undefined;
        title?: string | undefined;
        startTime?: string | undefined;
        clientId?: string | null | undefined;
        endTime?: string | undefined;
    }, {
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        description?: string | null | undefined;
        location?: string | null | undefined;
        assignedToId?: string | null | undefined;
        notes?: string | null | undefined;
        title?: string | undefined;
        startTime?: string | undefined;
        clientId?: string | null | undefined;
        endTime?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        description?: string | null | undefined;
        location?: string | null | undefined;
        assignedToId?: string | null | undefined;
        notes?: string | null | undefined;
        title?: string | undefined;
        startTime?: string | undefined;
        clientId?: string | null | undefined;
        endTime?: string | undefined;
    };
}, {
    body: {
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        description?: string | null | undefined;
        location?: string | null | undefined;
        assignedToId?: string | null | undefined;
        notes?: string | null | undefined;
        title?: string | undefined;
        startTime?: string | undefined;
        clientId?: string | null | undefined;
        endTime?: string | undefined;
    };
}>;
export declare const bookingQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        status: z.ZodOptional<z.ZodEnum<["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]>>;
        clientId: z.ZodOptional<z.ZodString>;
        assignedToId: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["startTime", "createdAt", "title"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "title" | "startTime";
        sortOrder: "asc" | "desc";
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        assignedToId?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        clientId?: string | undefined;
    }, {
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "title" | "startTime" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        assignedToId?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        clientId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "title" | "startTime";
        sortOrder: "asc" | "desc";
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        assignedToId?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        clientId?: string | undefined;
    };
}, {
    query: {
        status?: "CANCELLED" | "COMPLETED" | "PENDING" | "CONFIRMED" | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "title" | "startTime" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        assignedToId?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        clientId?: string | undefined;
    };
}>;
export declare const bookingIdSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
}, {
    params: {
        id: string;
    };
}>;
//# sourceMappingURL=bookings.validators.d.ts.map