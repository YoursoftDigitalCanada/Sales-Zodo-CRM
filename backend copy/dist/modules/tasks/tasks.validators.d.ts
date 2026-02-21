import { z } from 'zod';
export declare const createTaskSchema: z.ZodObject<{
    body: z.ZodObject<{
        taskTitle: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodDefault<z.ZodEnum<["TODO", "IN_PROGRESS", "REVIEW", "DONE"]>>;
        priority: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
        assignee: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
        tags: string[];
        priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
        taskTitle: string;
        description?: string | null | undefined;
        dueDate?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        assignee?: string | null | undefined;
    }, {
        taskTitle: string;
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        dueDate?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        assignee?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
        tags: string[];
        priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
        taskTitle: string;
        description?: string | null | undefined;
        dueDate?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        assignee?: string | null | undefined;
    };
}, {
    body: {
        taskTitle: string;
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        dueDate?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        assignee?: string | null | undefined;
    };
}>;
export declare const updateTaskSchema: z.ZodObject<{
    body: z.ZodObject<{
        taskTitle: z.ZodOptional<z.ZodString>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodOptional<z.ZodEnum<["TODO", "IN_PROGRESS", "REVIEW", "DONE"]>>;
        priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
        assignee: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        dueDate?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        taskTitle?: string | undefined;
        assignee?: string | null | undefined;
    }, {
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        dueDate?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        taskTitle?: string | undefined;
        assignee?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        dueDate?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        taskTitle?: string | undefined;
        assignee?: string | null | undefined;
    };
}, {
    body: {
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        dueDate?: string | null | undefined;
        projectId?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        taskTitle?: string | undefined;
        assignee?: string | null | undefined;
    };
}>;
export declare const taskQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["TODO", "IN_PROGRESS", "REVIEW", "DONE"]>>;
        priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
        assignee: z.ZodOptional<z.ZodString>;
        projectId: z.ZodOptional<z.ZodString>;
        clientId: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["taskTitle", "createdAt", "dueDate", "priority"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "dueDate" | "priority" | "taskTitle";
        sortOrder: "asc" | "desc";
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        search?: string | undefined;
        projectId?: string | undefined;
        clientId?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        assignee?: string | undefined;
    }, {
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "dueDate" | "priority" | "taskTitle" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        projectId?: string | undefined;
        clientId?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        assignee?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "dueDate" | "priority" | "taskTitle";
        sortOrder: "asc" | "desc";
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        search?: string | undefined;
        projectId?: string | undefined;
        clientId?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        assignee?: string | undefined;
    };
}, {
    query: {
        status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "dueDate" | "priority" | "taskTitle" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        projectId?: string | undefined;
        clientId?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
        assignee?: string | undefined;
    };
}>;
export declare const taskIdSchema: z.ZodObject<{
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
//# sourceMappingURL=tasks.validators.d.ts.map