import { z } from 'zod';
export declare const analyticsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        period: z.ZodDefault<z.ZodEnum<["day", "week", "month", "quarter", "year"]>>;
        groupBy: z.ZodOptional<z.ZodEnum<["status", "source", "assignee", "date"]>>;
    }, "strip", z.ZodTypeAny, {
        period: "year" | "week" | "day" | "month" | "quarter";
        startDate?: string | undefined;
        endDate?: string | undefined;
        groupBy?: "status" | "date" | "source" | "assignee" | undefined;
    }, {
        startDate?: string | undefined;
        endDate?: string | undefined;
        period?: "year" | "week" | "day" | "month" | "quarter" | undefined;
        groupBy?: "status" | "date" | "source" | "assignee" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        period: "year" | "week" | "day" | "month" | "quarter";
        startDate?: string | undefined;
        endDate?: string | undefined;
        groupBy?: "status" | "date" | "source" | "assignee" | undefined;
    };
}, {
    query: {
        startDate?: string | undefined;
        endDate?: string | undefined;
        period?: "year" | "week" | "day" | "month" | "quarter" | undefined;
        groupBy?: "status" | "date" | "source" | "assignee" | undefined;
    };
}>;
export declare const reportTypeSchema: z.ZodObject<{
    params: z.ZodObject<{
        type: z.ZodEnum<["leads", "clients", "tasks", "projects", "revenue", "expenses", "overview"]>;
    }, "strip", z.ZodTypeAny, {
        type: "leads" | "clients" | "tasks" | "projects" | "expenses" | "revenue" | "overview";
    }, {
        type: "leads" | "clients" | "tasks" | "projects" | "expenses" | "revenue" | "overview";
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        type: "leads" | "clients" | "tasks" | "projects" | "expenses" | "revenue" | "overview";
    };
}, {
    params: {
        type: "leads" | "clients" | "tasks" | "projects" | "expenses" | "revenue" | "overview";
    };
}>;
//# sourceMappingURL=analytics.validators.d.ts.map