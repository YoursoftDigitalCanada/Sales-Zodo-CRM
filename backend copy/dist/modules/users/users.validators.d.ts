import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        roleId: z.ZodOptional<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        isActive: boolean;
        firstName: string;
        lastName: string;
        password: string;
        roleId?: string | undefined;
        phone?: string | null | undefined;
    }, {
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        isActive?: boolean | undefined;
        roleId?: string | undefined;
        phone?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        isActive: boolean;
        firstName: string;
        lastName: string;
        password: string;
        roleId?: string | undefined;
        phone?: string | null | undefined;
    };
}, {
    body: {
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        isActive?: boolean | undefined;
        roleId?: string | undefined;
        phone?: string | null | undefined;
    };
}>;
export declare const updateUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        avatar: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        roleId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        isActive?: boolean | undefined;
        roleId?: string | null | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        avatar?: string | null | undefined;
        phone?: string | null | undefined;
    }, {
        isActive?: boolean | undefined;
        roleId?: string | null | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        avatar?: string | null | undefined;
        phone?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        isActive?: boolean | undefined;
        roleId?: string | null | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        avatar?: string | null | undefined;
        phone?: string | null | undefined;
    };
}, {
    body: {
        isActive?: boolean | undefined;
        roleId?: string | null | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        avatar?: string | null | undefined;
        phone?: string | null | undefined;
    };
}>;
export declare const userQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        roleId: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["firstName", "lastName", "email", "createdAt"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "email" | "createdAt" | "firstName" | "lastName";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        isActive?: boolean | undefined;
        roleId?: string | undefined;
    }, {
        search?: string | undefined;
        isActive?: boolean | undefined;
        roleId?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "email" | "createdAt" | "firstName" | "lastName" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "email" | "createdAt" | "firstName" | "lastName";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        isActive?: boolean | undefined;
        roleId?: string | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        isActive?: boolean | undefined;
        roleId?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "email" | "createdAt" | "firstName" | "lastName" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    };
}>;
export declare const userIdSchema: z.ZodObject<{
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
export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type UserQueryInput = z.infer<typeof userQuerySchema>['query'];
//# sourceMappingURL=users.validators.d.ts.map