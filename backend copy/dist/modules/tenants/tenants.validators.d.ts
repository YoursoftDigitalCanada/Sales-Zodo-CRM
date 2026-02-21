import { z } from 'zod';
export declare const createTenantSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        slug: z.ZodString;
        domain: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        plan: z.ZodDefault<z.ZodEnum<["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]>>;
        settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        slug: string;
        plan: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
        domain?: string | null | undefined;
        settings?: Record<string, unknown> | undefined;
    }, {
        name: string;
        slug: string;
        domain?: string | null | undefined;
        settings?: Record<string, unknown> | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        slug: string;
        plan: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
        domain?: string | null | undefined;
        settings?: Record<string, unknown> | undefined;
    };
}, {
    body: {
        name: string;
        slug: string;
        domain?: string | null | undefined;
        settings?: Record<string, unknown> | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    };
}>;
export declare const updateTenantSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        domain: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        plan: z.ZodOptional<z.ZodEnum<["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]>>;
        settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        isActive?: boolean | undefined;
        name?: string | undefined;
        domain?: string | null | undefined;
        settings?: Record<string, unknown> | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    }, {
        isActive?: boolean | undefined;
        name?: string | undefined;
        domain?: string | null | undefined;
        settings?: Record<string, unknown> | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        isActive?: boolean | undefined;
        name?: string | undefined;
        domain?: string | null | undefined;
        settings?: Record<string, unknown> | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    };
}, {
    body: {
        isActive?: boolean | undefined;
        name?: string | undefined;
        domain?: string | null | undefined;
        settings?: Record<string, unknown> | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    };
}>;
export declare const tenantQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        plan: z.ZodOptional<z.ZodEnum<["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt", "plan"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "name" | "plan";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        isActive?: boolean | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    }, {
        search?: string | undefined;
        isActive?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "name" | "plan" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "name" | "plan";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        isActive?: boolean | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        isActive?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "name" | "plan" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        plan?: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | undefined;
    };
}>;
export declare const tenantIdSchema: z.ZodObject<{
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
//# sourceMappingURL=tenants.validators.d.ts.map