import { z } from 'zod';
export declare const createTagSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        color?: string | null | undefined;
    }, {
        name: string;
        color?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        color?: string | null | undefined;
    };
}, {
    body: {
        name: string;
        color?: string | null | undefined;
    };
}>;
export declare const updateTagSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        color?: string | null | undefined;
    }, {
        name?: string | undefined;
        color?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name?: string | undefined;
        color?: string | null | undefined;
    };
}, {
    body: {
        name?: string | undefined;
        color?: string | null | undefined;
    };
}>;
export declare const tagQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
        limit: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
        search: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        search?: string | undefined;
    }, {
        search?: string | undefined;
        page?: string | undefined;
        limit?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        search?: string | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        page?: string | undefined;
        limit?: string | undefined;
    };
}>;
export declare const tagIdSchema: z.ZodObject<{
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
export type CreateTagInput = z.infer<typeof createTagSchema>['body'];
export type UpdateTagInput = z.infer<typeof updateTagSchema>['body'];
export type TagQueryInput = z.infer<typeof tagQuerySchema>['query'];
//# sourceMappingURL=tags.validators.d.ts.map