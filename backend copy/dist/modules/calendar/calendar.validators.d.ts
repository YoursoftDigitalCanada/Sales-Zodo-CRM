import { z } from 'zod';
export declare const createCalendarEventSchema: z.ZodObject<{
    body: z.ZodObject<{
        eventTitle: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isAllDay: z.ZodDefault<z.ZodBoolean>;
        startDate: z.ZodString;
        startTime: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        endDate: z.ZodString;
        endTime: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        category: z.ZodDefault<z.ZodEnum<["WORK", "MEETING", "PERSONAL", "DEADLINE", "OTHER"]>>;
        color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        meetingLink: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        priority: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>>;
        attendees: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        isPrivate: z.ZodDefault<z.ZodBoolean>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        startDate: string;
        endDate: string;
        priority: "LOW" | "MEDIUM" | "HIGH";
        category: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE";
        eventTitle: string;
        isAllDay: boolean;
        attendees: string[];
        isPrivate: boolean;
        description?: string | null | undefined;
        location?: string | null | undefined;
        notes?: string | null | undefined;
        color?: string | null | undefined;
        startTime?: string | null | undefined;
        endTime?: string | null | undefined;
        meetingLink?: string | null | undefined;
    }, {
        startDate: string;
        endDate: string;
        eventTitle: string;
        description?: string | null | undefined;
        location?: string | null | undefined;
        notes?: string | null | undefined;
        color?: string | null | undefined;
        startTime?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
        isAllDay?: boolean | undefined;
        endTime?: string | null | undefined;
        meetingLink?: string | null | undefined;
        attendees?: string[] | undefined;
        isPrivate?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        startDate: string;
        endDate: string;
        priority: "LOW" | "MEDIUM" | "HIGH";
        category: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE";
        eventTitle: string;
        isAllDay: boolean;
        attendees: string[];
        isPrivate: boolean;
        description?: string | null | undefined;
        location?: string | null | undefined;
        notes?: string | null | undefined;
        color?: string | null | undefined;
        startTime?: string | null | undefined;
        endTime?: string | null | undefined;
        meetingLink?: string | null | undefined;
    };
}, {
    body: {
        startDate: string;
        endDate: string;
        eventTitle: string;
        description?: string | null | undefined;
        location?: string | null | undefined;
        notes?: string | null | undefined;
        color?: string | null | undefined;
        startTime?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
        isAllDay?: boolean | undefined;
        endTime?: string | null | undefined;
        meetingLink?: string | null | undefined;
        attendees?: string[] | undefined;
        isPrivate?: boolean | undefined;
    };
}>;
export declare const updateCalendarEventSchema: z.ZodObject<{
    body: z.ZodObject<{
        eventTitle: z.ZodOptional<z.ZodString>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isAllDay: z.ZodOptional<z.ZodBoolean>;
        startDate: z.ZodOptional<z.ZodString>;
        startTime: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        endDate: z.ZodOptional<z.ZodString>;
        endTime: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        category: z.ZodOptional<z.ZodEnum<["WORK", "MEETING", "PERSONAL", "DEADLINE", "OTHER"]>>;
        color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        meetingLink: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>>;
        attendees: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isPrivate: z.ZodOptional<z.ZodBoolean>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
        location?: string | null | undefined;
        notes?: string | null | undefined;
        color?: string | null | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        startTime?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
        eventTitle?: string | undefined;
        isAllDay?: boolean | undefined;
        endTime?: string | null | undefined;
        meetingLink?: string | null | undefined;
        attendees?: string[] | undefined;
        isPrivate?: boolean | undefined;
    }, {
        description?: string | null | undefined;
        location?: string | null | undefined;
        notes?: string | null | undefined;
        color?: string | null | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        startTime?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
        eventTitle?: string | undefined;
        isAllDay?: boolean | undefined;
        endTime?: string | null | undefined;
        meetingLink?: string | null | undefined;
        attendees?: string[] | undefined;
        isPrivate?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        description?: string | null | undefined;
        location?: string | null | undefined;
        notes?: string | null | undefined;
        color?: string | null | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        startTime?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
        eventTitle?: string | undefined;
        isAllDay?: boolean | undefined;
        endTime?: string | null | undefined;
        meetingLink?: string | null | undefined;
        attendees?: string[] | undefined;
        isPrivate?: boolean | undefined;
    };
}, {
    body: {
        description?: string | null | undefined;
        location?: string | null | undefined;
        notes?: string | null | undefined;
        color?: string | null | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        startTime?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
        eventTitle?: string | undefined;
        isAllDay?: boolean | undefined;
        endTime?: string | null | undefined;
        meetingLink?: string | null | undefined;
        attendees?: string[] | undefined;
        isPrivate?: boolean | undefined;
    };
}>;
export declare const calendarEventQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodEnum<["WORK", "MEETING", "PERSONAL", "DEADLINE", "OTHER"]>>;
        priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>>;
        sortBy: z.ZodDefault<z.ZodEnum<["startDate", "eventTitle"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "startDate" | "eventTitle";
        sortOrder: "asc" | "desc";
        startDate?: string | undefined;
        endDate?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "startDate" | "eventTitle" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "startDate" | "eventTitle";
        sortOrder: "asc" | "desc";
        startDate?: string | undefined;
        endDate?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
    };
}, {
    query: {
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "startDate" | "eventTitle" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
        category?: "MEETING" | "OTHER" | "WORK" | "PERSONAL" | "DEADLINE" | undefined;
    };
}>;
export declare const calendarEventIdSchema: z.ZodObject<{
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
//# sourceMappingURL=calendar.validators.d.ts.map