import { z } from 'zod';
export declare const createEmployeeSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodString;
        employeeCode: z.ZodOptional<z.ZodString>;
        department: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        position: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        hireDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        salary: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        isActive: boolean;
        department?: string | null | undefined;
        position?: string | null | undefined;
        hireDate?: string | null | undefined;
        employeeCode?: string | undefined;
        salary?: number | null | undefined;
    }, {
        userId: string;
        department?: string | null | undefined;
        position?: string | null | undefined;
        hireDate?: string | null | undefined;
        isActive?: boolean | undefined;
        employeeCode?: string | undefined;
        salary?: number | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        userId: string;
        isActive: boolean;
        department?: string | null | undefined;
        position?: string | null | undefined;
        hireDate?: string | null | undefined;
        employeeCode?: string | undefined;
        salary?: number | null | undefined;
    };
}, {
    body: {
        userId: string;
        department?: string | null | undefined;
        position?: string | null | undefined;
        hireDate?: string | null | undefined;
        isActive?: boolean | undefined;
        employeeCode?: string | undefined;
        salary?: number | null | undefined;
    };
}>;
export declare const updateEmployeeSchema: z.ZodObject<{
    body: z.ZodObject<{
        employeeCode: z.ZodOptional<z.ZodString>;
        department: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        position: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        hireDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        salary: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        department?: string | null | undefined;
        position?: string | null | undefined;
        hireDate?: string | null | undefined;
        isActive?: boolean | undefined;
        employeeCode?: string | undefined;
        salary?: number | null | undefined;
    }, {
        department?: string | null | undefined;
        position?: string | null | undefined;
        hireDate?: string | null | undefined;
        isActive?: boolean | undefined;
        employeeCode?: string | undefined;
        salary?: number | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        department?: string | null | undefined;
        position?: string | null | undefined;
        hireDate?: string | null | undefined;
        isActive?: boolean | undefined;
        employeeCode?: string | undefined;
        salary?: number | null | undefined;
    };
}, {
    body: {
        department?: string | null | undefined;
        position?: string | null | undefined;
        hireDate?: string | null | undefined;
        isActive?: boolean | undefined;
        employeeCode?: string | undefined;
        salary?: number | null | undefined;
    };
}>;
export declare const employeeQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        department: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "hireDate", "position"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "position" | "hireDate" | "createdAt";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        department?: string | undefined;
        isActive?: boolean | undefined;
    }, {
        search?: string | undefined;
        department?: string | undefined;
        isActive?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "position" | "hireDate" | "createdAt" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "position" | "hireDate" | "createdAt";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
        department?: string | undefined;
        isActive?: boolean | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        department?: string | undefined;
        isActive?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "position" | "hireDate" | "createdAt" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    };
}>;
export declare const employeeIdSchema: z.ZodObject<{
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
//# sourceMappingURL=employees.validators.d.ts.map