import { z } from 'zod';
export declare const createExpenseSchema: z.ZodObject<{
    body: z.ZodObject<{
        category: z.ZodString;
        description: z.ZodString;
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        expenseDate: z.ZodString;
        status: z.ZodDefault<z.ZodEnum<["PENDING", "APPROVED", "REJECTED", "REIMBURSED"]>>;
        receipt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING";
        description: string;
        currency: string;
        amount: number;
        category: string;
        expenseDate: string;
        receipt?: string | null | undefined;
        notes?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
    }, {
        description: string;
        amount: number;
        category: string;
        expenseDate: string;
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        receipt?: string | null | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING";
        description: string;
        currency: string;
        amount: number;
        category: string;
        expenseDate: string;
        receipt?: string | null | undefined;
        notes?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
    };
}, {
    body: {
        description: string;
        amount: number;
        category: string;
        expenseDate: string;
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        receipt?: string | null | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
    };
}>;
export declare const updateExpenseSchema: z.ZodObject<{
    body: z.ZodObject<{
        category: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        amount: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
        expenseDate: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["PENDING", "APPROVED", "REJECTED", "REIMBURSED"]>>;
        receipt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        description?: string | undefined;
        receipt?: string | null | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        amount?: number | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        category?: string | undefined;
        expenseDate?: string | undefined;
    }, {
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        description?: string | undefined;
        receipt?: string | null | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        amount?: number | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        category?: string | undefined;
        expenseDate?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        description?: string | undefined;
        receipt?: string | null | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        amount?: number | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        category?: string | undefined;
        expenseDate?: string | undefined;
    };
}, {
    body: {
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        description?: string | undefined;
        receipt?: string | null | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        amount?: number | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        category?: string | undefined;
        expenseDate?: string | undefined;
    };
}>;
export declare const expenseQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["PENDING", "APPROVED", "REJECTED", "REIMBURSED"]>>;
        category: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["expenseDate", "amount", "category", "status"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "status" | "amount" | "category" | "expenseDate";
        sortOrder: "asc" | "desc";
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        search?: string | undefined;
        category?: string | undefined;
    }, {
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "status" | "amount" | "category" | "expenseDate" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        category?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "status" | "amount" | "category" | "expenseDate";
        sortOrder: "asc" | "desc";
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        search?: string | undefined;
        category?: string | undefined;
    };
}, {
    query: {
        status?: "APPROVED" | "REJECTED" | "REIMBURSED" | "PENDING" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "status" | "amount" | "category" | "expenseDate" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        category?: string | undefined;
    };
}>;
export declare const expenseIdSchema: z.ZodObject<{
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
//# sourceMappingURL=expenses.validators.d.ts.map