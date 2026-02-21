import { z } from 'zod';
export declare const notificationQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
        limit: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
        isRead: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean | undefined, string | undefined>;
        type: z.ZodOptional<z.ZodNativeEnum<{
            INFO: "INFO";
            SUCCESS: "SUCCESS";
            WARNING: "WARNING";
            ERROR: "ERROR";
            SYSTEM: "SYSTEM";
        }>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM" | undefined;
        isRead?: boolean | undefined;
    }, {
        type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM" | undefined;
        page?: string | undefined;
        limit?: string | undefined;
        isRead?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM" | undefined;
        isRead?: boolean | undefined;
    };
}, {
    query: {
        type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM" | undefined;
        page?: string | undefined;
        limit?: string | undefined;
        isRead?: string | undefined;
    };
}>;
export declare const markReadSchema: z.ZodObject<{
    body: z.ZodObject<{
        notificationIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        notificationIds: string[];
    }, {
        notificationIds: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        notificationIds: string[];
    };
}, {
    body: {
        notificationIds: string[];
    };
}>;
export declare const notificationIdSchema: z.ZodObject<{
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
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>['query'];
export type MarkReadInput = z.infer<typeof markReadSchema>['body'];
//# sourceMappingURL=notifications.validators.d.ts.map