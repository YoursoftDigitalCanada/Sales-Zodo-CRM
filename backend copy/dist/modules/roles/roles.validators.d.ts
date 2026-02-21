import { z } from 'zod';
export declare const createRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        isDefault: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        isDefault: boolean;
        permissions: string[];
        description?: string | null | undefined;
    }, {
        name: string;
        description?: string | null | undefined;
        isDefault?: boolean | undefined;
        permissions?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        isDefault: boolean;
        permissions: string[];
        description?: string | null | undefined;
    };
}, {
    body: {
        name: string;
        description?: string | null | undefined;
        isDefault?: boolean | undefined;
        permissions?: string[] | undefined;
    };
}>;
export declare const updateRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isDefault: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        description?: string | null | undefined;
        isDefault?: boolean | undefined;
        permissions?: string[] | undefined;
    }, {
        name?: string | undefined;
        description?: string | null | undefined;
        isDefault?: boolean | undefined;
        permissions?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name?: string | undefined;
        description?: string | null | undefined;
        isDefault?: boolean | undefined;
        permissions?: string[] | undefined;
    };
}, {
    body: {
        name?: string | undefined;
        description?: string | null | undefined;
        isDefault?: boolean | undefined;
        permissions?: string[] | undefined;
    };
}>;
export declare const roleQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "name";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
    }, {
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "name" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "name";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "name" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    };
}>;
export declare const roleIdSchema: z.ZodObject<{
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
//# sourceMappingURL=roles.validators.d.ts.map