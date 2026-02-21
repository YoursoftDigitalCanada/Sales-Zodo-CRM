import { z } from 'zod';
export declare const createContactSchema: z.ZodObject<{
    body: z.ZodObject<{
        contactName: z.ZodString;
        companyId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        type: z.ZodDefault<z.ZodEnum<["CLIENT", "LEAD"]>>;
        jobTitle: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        department: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        email: z.ZodString;
        officePhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        mobilePhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        linkedInUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isPrimaryContact: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "CLIENT" | "LEAD";
        email: string;
        contactName: string;
        isPrimaryContact: boolean;
        department?: string | null | undefined;
        jobTitle?: string | null | undefined;
        officePhone?: string | null | undefined;
        mobilePhone?: string | null | undefined;
        linkedInUrl?: string | null | undefined;
        companyId?: string | null | undefined;
    }, {
        email: string;
        contactName: string;
        type?: "CLIENT" | "LEAD" | undefined;
        department?: string | null | undefined;
        jobTitle?: string | null | undefined;
        officePhone?: string | null | undefined;
        mobilePhone?: string | null | undefined;
        linkedInUrl?: string | null | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        type: "CLIENT" | "LEAD";
        email: string;
        contactName: string;
        isPrimaryContact: boolean;
        department?: string | null | undefined;
        jobTitle?: string | null | undefined;
        officePhone?: string | null | undefined;
        mobilePhone?: string | null | undefined;
        linkedInUrl?: string | null | undefined;
        companyId?: string | null | undefined;
    };
}, {
    body: {
        email: string;
        contactName: string;
        type?: "CLIENT" | "LEAD" | undefined;
        department?: string | null | undefined;
        jobTitle?: string | null | undefined;
        officePhone?: string | null | undefined;
        mobilePhone?: string | null | undefined;
        linkedInUrl?: string | null | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | null | undefined;
    };
}>;
export declare const updateContactSchema: z.ZodObject<{
    body: z.ZodObject<{
        contactName: z.ZodOptional<z.ZodString>;
        companyId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        type: z.ZodOptional<z.ZodEnum<["CLIENT", "LEAD"]>>;
        jobTitle: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        department: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        email: z.ZodOptional<z.ZodString>;
        officePhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        mobilePhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        linkedInUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isPrimaryContact: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type?: "CLIENT" | "LEAD" | undefined;
        email?: string | undefined;
        department?: string | null | undefined;
        jobTitle?: string | null | undefined;
        contactName?: string | undefined;
        officePhone?: string | null | undefined;
        mobilePhone?: string | null | undefined;
        linkedInUrl?: string | null | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | null | undefined;
    }, {
        type?: "CLIENT" | "LEAD" | undefined;
        email?: string | undefined;
        department?: string | null | undefined;
        jobTitle?: string | null | undefined;
        contactName?: string | undefined;
        officePhone?: string | null | undefined;
        mobilePhone?: string | null | undefined;
        linkedInUrl?: string | null | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        type?: "CLIENT" | "LEAD" | undefined;
        email?: string | undefined;
        department?: string | null | undefined;
        jobTitle?: string | null | undefined;
        contactName?: string | undefined;
        officePhone?: string | null | undefined;
        mobilePhone?: string | null | undefined;
        linkedInUrl?: string | null | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | null | undefined;
    };
}, {
    body: {
        type?: "CLIENT" | "LEAD" | undefined;
        email?: string | undefined;
        department?: string | null | undefined;
        jobTitle?: string | null | undefined;
        contactName?: string | undefined;
        officePhone?: string | null | undefined;
        mobilePhone?: string | null | undefined;
        linkedInUrl?: string | null | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | null | undefined;
    };
}>;
export declare const contactQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        companyId: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["CLIENT", "LEAD"]>>;
        isPrimaryContact: z.ZodOptional<z.ZodBoolean>;
        sortBy: z.ZodDefault<z.ZodEnum<["contactName", "createdAt", "email"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "email" | "createdAt" | "contactName";
        sortOrder: "asc" | "desc";
        type?: "CLIENT" | "LEAD" | undefined;
        search?: string | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | undefined;
    }, {
        type?: "CLIENT" | "LEAD" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "email" | "createdAt" | "contactName" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "email" | "createdAt" | "contactName";
        sortOrder: "asc" | "desc";
        type?: "CLIENT" | "LEAD" | undefined;
        search?: string | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | undefined;
    };
}, {
    query: {
        type?: "CLIENT" | "LEAD" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "email" | "createdAt" | "contactName" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        isPrimaryContact?: boolean | undefined;
        companyId?: string | undefined;
    };
}>;
export declare const contactIdSchema: z.ZodObject<{
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
//# sourceMappingURL=contacts.validators.d.ts.map