import { z } from 'zod';
export declare const createGroupSchema: z.ZodObject<{
    body: z.ZodObject<{
        groupName: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        groupType: z.ZodDefault<z.ZodEnum<["DEFAULT", "CUSTOM"]>>;
        icon: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        autoUpdateMembers: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        groupName: string;
        groupType: "CUSTOM" | "DEFAULT";
        autoUpdateMembers: boolean;
        description?: string | null | undefined;
        color?: string | null | undefined;
        icon?: string | null | undefined;
    }, {
        groupName: string;
        description?: string | null | undefined;
        color?: string | null | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
        icon?: string | null | undefined;
        autoUpdateMembers?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        groupName: string;
        groupType: "CUSTOM" | "DEFAULT";
        autoUpdateMembers: boolean;
        description?: string | null | undefined;
        color?: string | null | undefined;
        icon?: string | null | undefined;
    };
}, {
    body: {
        groupName: string;
        description?: string | null | undefined;
        color?: string | null | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
        icon?: string | null | undefined;
        autoUpdateMembers?: boolean | undefined;
    };
}>;
export declare const updateGroupSchema: z.ZodObject<{
    body: z.ZodObject<{
        groupName: z.ZodOptional<z.ZodString>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        groupType: z.ZodOptional<z.ZodEnum<["DEFAULT", "CUSTOM"]>>;
        icon: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        autoUpdateMembers: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        description?: string | null | undefined;
        color?: string | null | undefined;
        groupName?: string | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
        icon?: string | null | undefined;
        autoUpdateMembers?: boolean | undefined;
    }, {
        description?: string | null | undefined;
        color?: string | null | undefined;
        groupName?: string | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
        icon?: string | null | undefined;
        autoUpdateMembers?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        description?: string | null | undefined;
        color?: string | null | undefined;
        groupName?: string | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
        icon?: string | null | undefined;
        autoUpdateMembers?: boolean | undefined;
    };
}, {
    body: {
        description?: string | null | undefined;
        color?: string | null | undefined;
        groupName?: string | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
        icon?: string | null | undefined;
        autoUpdateMembers?: boolean | undefined;
    };
}>;
export declare const groupQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        groupType: z.ZodOptional<z.ZodEnum<["DEFAULT", "CUSTOM"]>>;
        sortBy: z.ZodDefault<z.ZodEnum<["groupName", "createdAt"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "groupName";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
    }, {
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "groupName" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "groupName";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "groupName" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        groupType?: "CUSTOM" | "DEFAULT" | undefined;
    };
}>;
export declare const groupIdSchema: z.ZodObject<{
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
export declare const addMembersSchema: z.ZodObject<{
    body: z.ZodObject<{
        clientIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        clientIds: string[];
    }, {
        clientIds: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        clientIds: string[];
    };
}, {
    body: {
        clientIds: string[];
    };
}>;
//# sourceMappingURL=groups.validators.d.ts.map