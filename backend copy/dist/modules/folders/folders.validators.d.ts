import { z } from 'zod';
export declare const createFolderSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        parentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | null | undefined;
        parentId?: string | null | undefined;
    }, {
        name: string;
        description?: string | null | undefined;
        parentId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        description?: string | null | undefined;
        parentId?: string | null | undefined;
    };
}, {
    body: {
        name: string;
        description?: string | null | undefined;
        parentId?: string | null | undefined;
    };
}>;
export declare const updateFolderSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        parentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        description?: string | null | undefined;
        parentId?: string | null | undefined;
    }, {
        name?: string | undefined;
        description?: string | null | undefined;
        parentId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name?: string | undefined;
        description?: string | null | undefined;
        parentId?: string | null | undefined;
    };
}, {
    body: {
        name?: string | undefined;
        description?: string | null | undefined;
        parentId?: string | null | undefined;
    };
}>;
export declare const folderQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        parentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "name";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        parentId?: string | null | undefined;
    }, {
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "name" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        parentId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "name";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        parentId?: string | null | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "name" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        parentId?: string | null | undefined;
    };
}>;
export declare const folderIdSchema: z.ZodObject<{
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
//# sourceMappingURL=folders.validators.d.ts.map