import { z } from 'zod';
export declare const createProjectSchema: z.ZodObject<{
    body: z.ZodObject<{
        projectTitle: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        projectManagerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        startDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        progressPercentage: z.ZodDefault<z.ZodNumber>;
        status: z.ZodDefault<z.ZodEnum<["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]>>;
        milestones: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            isCompleted: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            isCompleted: boolean;
            dueDate?: string | null | undefined;
        }, {
            title: string;
            dueDate?: string | null | undefined;
            isCompleted?: boolean | undefined;
        }>, "many">>;
        teamMembers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            url: z.ZodString;
            type: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            url: string;
            type?: string | undefined;
        }, {
            name: string;
            url: string;
            type?: string | undefined;
        }>, "many">>;
        priority: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
        budget: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        estimatedHours: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        notifyTeamMembers: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        status: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED";
        tags: string[];
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        projectTitle: string;
        progressPercentage: number;
        milestones: {
            title: string;
            isCompleted: boolean;
            dueDate?: string | null | undefined;
        }[];
        teamMembers: string[];
        attachments: {
            name: string;
            url: string;
            type?: string | undefined;
        }[];
        notifyTeamMembers: boolean;
        description?: string | null | undefined;
        startDate?: string | null | undefined;
        dueDate?: string | null | undefined;
        clientId?: string | null | undefined;
        estimatedHours?: number | null | undefined;
        budget?: number | null | undefined;
        category?: string | null | undefined;
        projectManagerId?: string | null | undefined;
    }, {
        projectTitle: string;
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        startDate?: string | null | undefined;
        dueDate?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        estimatedHours?: number | null | undefined;
        budget?: number | null | undefined;
        category?: string | null | undefined;
        projectManagerId?: string | null | undefined;
        progressPercentage?: number | undefined;
        milestones?: {
            title: string;
            dueDate?: string | null | undefined;
            isCompleted?: boolean | undefined;
        }[] | undefined;
        teamMembers?: string[] | undefined;
        attachments?: {
            name: string;
            url: string;
            type?: string | undefined;
        }[] | undefined;
        notifyTeamMembers?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED";
        tags: string[];
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        projectTitle: string;
        progressPercentage: number;
        milestones: {
            title: string;
            isCompleted: boolean;
            dueDate?: string | null | undefined;
        }[];
        teamMembers: string[];
        attachments: {
            name: string;
            url: string;
            type?: string | undefined;
        }[];
        notifyTeamMembers: boolean;
        description?: string | null | undefined;
        startDate?: string | null | undefined;
        dueDate?: string | null | undefined;
        clientId?: string | null | undefined;
        estimatedHours?: number | null | undefined;
        budget?: number | null | undefined;
        category?: string | null | undefined;
        projectManagerId?: string | null | undefined;
    };
}, {
    body: {
        projectTitle: string;
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        startDate?: string | null | undefined;
        dueDate?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        estimatedHours?: number | null | undefined;
        budget?: number | null | undefined;
        category?: string | null | undefined;
        projectManagerId?: string | null | undefined;
        progressPercentage?: number | undefined;
        milestones?: {
            title: string;
            dueDate?: string | null | undefined;
            isCompleted?: boolean | undefined;
        }[] | undefined;
        teamMembers?: string[] | undefined;
        attachments?: {
            name: string;
            url: string;
            type?: string | undefined;
        }[] | undefined;
        notifyTeamMembers?: boolean | undefined;
    };
}>;
export declare const updateProjectSchema: z.ZodObject<{
    body: z.ZodObject<{
        projectTitle: z.ZodOptional<z.ZodString>;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        projectManagerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        startDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        progressPercentage: z.ZodOptional<z.ZodNumber>;
        status: z.ZodOptional<z.ZodEnum<["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]>>;
        milestones: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            isCompleted: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            isCompleted: boolean;
            dueDate?: string | null | undefined;
        }, {
            title: string;
            dueDate?: string | null | undefined;
            isCompleted?: boolean | undefined;
        }>, "many">>;
        teamMembers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            url: z.ZodString;
            type: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            url: string;
            type?: string | undefined;
        }, {
            name: string;
            url: string;
            type?: string | undefined;
        }>, "many">>;
        priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
        budget: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        estimatedHours: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        notifyTeamMembers: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        startDate?: string | null | undefined;
        dueDate?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        estimatedHours?: number | null | undefined;
        budget?: number | null | undefined;
        projectTitle?: string | undefined;
        category?: string | null | undefined;
        projectManagerId?: string | null | undefined;
        progressPercentage?: number | undefined;
        milestones?: {
            title: string;
            isCompleted: boolean;
            dueDate?: string | null | undefined;
        }[] | undefined;
        teamMembers?: string[] | undefined;
        attachments?: {
            name: string;
            url: string;
            type?: string | undefined;
        }[] | undefined;
        notifyTeamMembers?: boolean | undefined;
    }, {
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        startDate?: string | null | undefined;
        dueDate?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        estimatedHours?: number | null | undefined;
        budget?: number | null | undefined;
        projectTitle?: string | undefined;
        category?: string | null | undefined;
        projectManagerId?: string | null | undefined;
        progressPercentage?: number | undefined;
        milestones?: {
            title: string;
            dueDate?: string | null | undefined;
            isCompleted?: boolean | undefined;
        }[] | undefined;
        teamMembers?: string[] | undefined;
        attachments?: {
            name: string;
            url: string;
            type?: string | undefined;
        }[] | undefined;
        notifyTeamMembers?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        startDate?: string | null | undefined;
        dueDate?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        estimatedHours?: number | null | undefined;
        budget?: number | null | undefined;
        projectTitle?: string | undefined;
        category?: string | null | undefined;
        projectManagerId?: string | null | undefined;
        progressPercentage?: number | undefined;
        milestones?: {
            title: string;
            isCompleted: boolean;
            dueDate?: string | null | undefined;
        }[] | undefined;
        teamMembers?: string[] | undefined;
        attachments?: {
            name: string;
            url: string;
            type?: string | undefined;
        }[] | undefined;
        notifyTeamMembers?: boolean | undefined;
    };
}, {
    body: {
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        tags?: string[] | undefined;
        description?: string | null | undefined;
        startDate?: string | null | undefined;
        dueDate?: string | null | undefined;
        clientId?: string | null | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        estimatedHours?: number | null | undefined;
        budget?: number | null | undefined;
        projectTitle?: string | undefined;
        category?: string | null | undefined;
        projectManagerId?: string | null | undefined;
        progressPercentage?: number | undefined;
        milestones?: {
            title: string;
            dueDate?: string | null | undefined;
            isCompleted?: boolean | undefined;
        }[] | undefined;
        teamMembers?: string[] | undefined;
        attachments?: {
            name: string;
            url: string;
            type?: string | undefined;
        }[] | undefined;
        notifyTeamMembers?: boolean | undefined;
    };
}>;
export declare const projectQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]>>;
        priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
        clientId: z.ZodOptional<z.ZodString>;
        projectManagerId: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["projectTitle", "createdAt", "dueDate", "priority"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "dueDate" | "priority" | "projectTitle";
        sortOrder: "asc" | "desc";
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        search?: string | undefined;
        clientId?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        projectManagerId?: string | undefined;
    }, {
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "dueDate" | "priority" | "projectTitle" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        clientId?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        projectManagerId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "dueDate" | "priority" | "projectTitle";
        sortOrder: "asc" | "desc";
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        search?: string | undefined;
        clientId?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        projectManagerId?: string | undefined;
    };
}, {
    query: {
        status?: "CANCELLED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "NOT_STARTED" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "dueDate" | "priority" | "projectTitle" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        clientId?: string | undefined;
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
        projectManagerId?: string | undefined;
    };
}>;
export declare const projectIdSchema: z.ZodObject<{
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
//# sourceMappingURL=projects.validators.d.ts.map