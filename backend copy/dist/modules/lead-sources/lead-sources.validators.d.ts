import { z } from 'zod';
export declare const createLeadSourceSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        isActive: boolean;
        name: string;
        description?: string | null | undefined;
    }, {
        name: string;
        isActive?: boolean | undefined;
        description?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        isActive: boolean;
        name: string;
        description?: string | null | undefined;
    };
}, {
    body: {
        name: string;
        isActive?: boolean | undefined;
        description?: string | null | undefined;
    };
}>;
export declare const updateLeadSourceSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        isActive?: boolean | undefined;
        name?: string | undefined;
        description?: string | null | undefined;
    }, {
        isActive?: boolean | undefined;
        name?: string | undefined;
        description?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        isActive?: boolean | undefined;
        name?: string | undefined;
        description?: string | null | undefined;
    };
}, {
    body: {
        isActive?: boolean | undefined;
        name?: string | undefined;
        description?: string | null | undefined;
    };
}>;
export declare const leadSourceQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
        limit: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
        search: z.ZodOptional<z.ZodString>;
        isActive: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean | undefined, string | undefined>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        search?: string | undefined;
        isActive?: boolean | undefined;
    }, {
        search?: string | undefined;
        isActive?: string | undefined;
        page?: string | undefined;
        limit?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        search?: string | undefined;
        isActive?: boolean | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        isActive?: string | undefined;
        page?: string | undefined;
        limit?: string | undefined;
    };
}>;
export declare const leadSourceIdSchema: z.ZodObject<{
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
export type CreateLeadSourceInput = z.infer<typeof createLeadSourceSchema>['body'];
export type UpdateLeadSourceInput = z.infer<typeof updateLeadSourceSchema>['body'];
export type LeadSourceQueryInput = z.infer<typeof leadSourceQuerySchema>['query'];
//# sourceMappingURL=lead-sources.validators.d.ts.map