import { z } from 'zod';
export declare const uploadFileSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        folderId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        folderId?: string | null | undefined;
    }, {
        name: string;
        description?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        folderId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        description?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        folderId?: string | null | undefined;
    };
}, {
    body: {
        name: string;
        description?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        folderId?: string | null | undefined;
    };
}>;
export declare const updateFileSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        folderId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        description?: string | null | undefined;
        folderId?: string | null | undefined;
    }, {
        name?: string | undefined;
        description?: string | null | undefined;
        folderId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name?: string | undefined;
        description?: string | null | undefined;
        folderId?: string | null | undefined;
    };
}, {
    body: {
        name?: string | undefined;
        description?: string | null | undefined;
        folderId?: string | null | undefined;
    };
}>;
export declare const fileQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        folderId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodOptional<z.ZodString>;
        projectId: z.ZodOptional<z.ZodString>;
        mimeType: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt", "size"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "name" | "size";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        projectId?: string | undefined;
        clientId?: string | undefined;
        mimeType?: string | undefined;
        folderId?: string | null | undefined;
    }, {
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "name" | "size" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        projectId?: string | undefined;
        clientId?: string | undefined;
        mimeType?: string | undefined;
        folderId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "name" | "size";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        projectId?: string | undefined;
        clientId?: string | undefined;
        mimeType?: string | undefined;
        folderId?: string | null | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "name" | "size" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        projectId?: string | undefined;
        clientId?: string | undefined;
        mimeType?: string | undefined;
        folderId?: string | null | undefined;
    };
}>;
export declare const fileIdSchema: z.ZodObject<{
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
//# sourceMappingURL=files.validators.d.ts.map