import { z } from 'zod';
export declare const createEmailTemplateSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        subject: z.ZodString;
        body: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<["LEAD_WELCOME", "CLIENT_WELCOME", "INVOICE", "REMINDER", "NOTIFICATION", "CUSTOM"]>>;
        variables: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION";
        subject: string;
        isActive: boolean;
        name: string;
        body: string;
        variables: string[];
    }, {
        subject: string;
        name: string;
        body: string;
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        isActive?: boolean | undefined;
        variables?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        type: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION";
        subject: string;
        isActive: boolean;
        name: string;
        body: string;
        variables: string[];
    };
}, {
    body: {
        subject: string;
        name: string;
        body: string;
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        isActive?: boolean | undefined;
        variables?: string[] | undefined;
    };
}>;
export declare const updateEmailTemplateSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        subject: z.ZodOptional<z.ZodString>;
        body: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["LEAD_WELCOME", "CLIENT_WELCOME", "INVOICE", "REMINDER", "NOTIFICATION", "CUSTOM"]>>;
        variables: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        subject?: string | undefined;
        isActive?: boolean | undefined;
        name?: string | undefined;
        body?: string | undefined;
        variables?: string[] | undefined;
    }, {
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        subject?: string | undefined;
        isActive?: boolean | undefined;
        name?: string | undefined;
        body?: string | undefined;
        variables?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        subject?: string | undefined;
        isActive?: boolean | undefined;
        name?: string | undefined;
        body?: string | undefined;
        variables?: string[] | undefined;
    };
}, {
    body: {
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        subject?: string | undefined;
        isActive?: boolean | undefined;
        name?: string | undefined;
        body?: string | undefined;
        variables?: string[] | undefined;
    };
}>;
export declare const emailTemplateQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["LEAD_WELCOME", "CLIENT_WELCOME", "INVOICE", "REMINDER", "NOTIFICATION", "CUSTOM"]>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        sortBy: z.ZodDefault<z.ZodEnum<["name", "createdAt", "type"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "type" | "createdAt" | "name";
        sortOrder: "asc" | "desc";
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        search?: string | undefined;
        isActive?: boolean | undefined;
    }, {
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        search?: string | undefined;
        isActive?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "type" | "createdAt" | "name" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "type" | "createdAt" | "name";
        sortOrder: "asc" | "desc";
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        search?: string | undefined;
        isActive?: boolean | undefined;
    };
}, {
    query: {
        type?: "CUSTOM" | "REMINDER" | "LEAD_WELCOME" | "CLIENT_WELCOME" | "INVOICE" | "NOTIFICATION" | undefined;
        search?: string | undefined;
        isActive?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "type" | "createdAt" | "name" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    };
}>;
export declare const emailTemplateIdSchema: z.ZodObject<{
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
export declare const sendEmailSchema: z.ZodObject<{
    body: z.ZodObject<{
        templateId: z.ZodOptional<z.ZodString>;
        to: z.ZodArray<z.ZodString, "many">;
        subject: z.ZodString;
        body: z.ZodString;
        variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        subject: string;
        body: string;
        to: string[];
        variables?: Record<string, string> | undefined;
        templateId?: string | undefined;
    }, {
        subject: string;
        body: string;
        to: string[];
        variables?: Record<string, string> | undefined;
        templateId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        subject: string;
        body: string;
        to: string[];
        variables?: Record<string, string> | undefined;
        templateId?: string | undefined;
    };
}, {
    body: {
        subject: string;
        body: string;
        to: string[];
        variables?: Record<string, string> | undefined;
        templateId?: string | undefined;
    };
}>;
//# sourceMappingURL=emails.validators.d.ts.map