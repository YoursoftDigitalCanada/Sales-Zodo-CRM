import { z } from 'zod';
export declare const createInvoiceSchema: z.ZodObject<{
    body: z.ZodObject<{
        invoiceNumber: z.ZodString;
        invoiceDate: z.ZodString;
        paymentTerms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        dueDate: z.ZodString;
        currency: z.ZodDefault<z.ZodString>;
        taxProvince: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        taxRates: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            rate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            rate: number;
        }, {
            name: string;
            rate: number;
        }>, "many">>;
        businessName: z.ZodString;
        businessEmail: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        businessPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        businessAddress: z.ZodOptional<z.ZodObject<{
            address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            province: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            postalCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        }, {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        }>>;
        businessGstHstNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientBusinessName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientEmail: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientAddress: z.ZodOptional<z.ZodObject<{
            address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            province: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            postalCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        }, {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        }>>;
        clientGstHstNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        items: z.ZodArray<z.ZodObject<{
            itemName: z.ZodString;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            quantity: z.ZodDefault<z.ZodNumber>;
            rate: z.ZodNumber;
            taxApplied: z.ZodDefault<z.ZodBoolean>;
            lineTotal: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            quantity: number;
            itemName: string;
            rate: number;
            taxApplied: boolean;
            description?: string | null | undefined;
            lineTotal?: number | undefined;
        }, {
            itemName: string;
            rate: number;
            description?: string | null | undefined;
            quantity?: number | undefined;
            taxApplied?: boolean | undefined;
            lineTotal?: number | undefined;
        }>, "many">;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        dueDate: string;
        invoiceNumber: string;
        invoiceDate: string;
        taxRates: {
            name: string;
            rate: number;
        }[];
        businessName: string;
        items: {
            quantity: number;
            itemName: string;
            rate: number;
            taxApplied: boolean;
            description?: string | null | undefined;
            lineTotal?: number | undefined;
        }[];
        notes?: string | null | undefined;
        paymentTerms?: string | null | undefined;
        clientId?: string | null | undefined;
        taxProvince?: string | null | undefined;
        businessEmail?: string | null | undefined;
        businessPhone?: string | null | undefined;
        businessAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        businessGstHstNumber?: string | null | undefined;
        clientBusinessName?: string | null | undefined;
        clientEmail?: string | null | undefined;
        clientPhone?: string | null | undefined;
        clientAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        clientGstHstNumber?: string | null | undefined;
    }, {
        dueDate: string;
        invoiceNumber: string;
        invoiceDate: string;
        businessName: string;
        items: {
            itemName: string;
            rate: number;
            description?: string | null | undefined;
            quantity?: number | undefined;
            taxApplied?: boolean | undefined;
            lineTotal?: number | undefined;
        }[];
        currency?: string | undefined;
        notes?: string | null | undefined;
        paymentTerms?: string | null | undefined;
        clientId?: string | null | undefined;
        taxProvince?: string | null | undefined;
        taxRates?: {
            name: string;
            rate: number;
        }[] | undefined;
        businessEmail?: string | null | undefined;
        businessPhone?: string | null | undefined;
        businessAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        businessGstHstNumber?: string | null | undefined;
        clientBusinessName?: string | null | undefined;
        clientEmail?: string | null | undefined;
        clientPhone?: string | null | undefined;
        clientAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        clientGstHstNumber?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        currency: string;
        dueDate: string;
        invoiceNumber: string;
        invoiceDate: string;
        taxRates: {
            name: string;
            rate: number;
        }[];
        businessName: string;
        items: {
            quantity: number;
            itemName: string;
            rate: number;
            taxApplied: boolean;
            description?: string | null | undefined;
            lineTotal?: number | undefined;
        }[];
        notes?: string | null | undefined;
        paymentTerms?: string | null | undefined;
        clientId?: string | null | undefined;
        taxProvince?: string | null | undefined;
        businessEmail?: string | null | undefined;
        businessPhone?: string | null | undefined;
        businessAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        businessGstHstNumber?: string | null | undefined;
        clientBusinessName?: string | null | undefined;
        clientEmail?: string | null | undefined;
        clientPhone?: string | null | undefined;
        clientAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        clientGstHstNumber?: string | null | undefined;
    };
}, {
    body: {
        dueDate: string;
        invoiceNumber: string;
        invoiceDate: string;
        businessName: string;
        items: {
            itemName: string;
            rate: number;
            description?: string | null | undefined;
            quantity?: number | undefined;
            taxApplied?: boolean | undefined;
            lineTotal?: number | undefined;
        }[];
        currency?: string | undefined;
        notes?: string | null | undefined;
        paymentTerms?: string | null | undefined;
        clientId?: string | null | undefined;
        taxProvince?: string | null | undefined;
        taxRates?: {
            name: string;
            rate: number;
        }[] | undefined;
        businessEmail?: string | null | undefined;
        businessPhone?: string | null | undefined;
        businessAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        businessGstHstNumber?: string | null | undefined;
        clientBusinessName?: string | null | undefined;
        clientEmail?: string | null | undefined;
        clientPhone?: string | null | undefined;
        clientAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        clientGstHstNumber?: string | null | undefined;
    };
}>;
export declare const updateInvoiceSchema: z.ZodObject<{
    body: z.ZodObject<{
        invoiceNumber: z.ZodOptional<z.ZodString>;
        invoiceDate: z.ZodOptional<z.ZodString>;
        paymentTerms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        dueDate: z.ZodOptional<z.ZodString>;
        currency: z.ZodOptional<z.ZodString>;
        taxProvince: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        taxRates: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            rate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            rate: number;
        }, {
            name: string;
            rate: number;
        }>, "many">>;
        businessName: z.ZodOptional<z.ZodString>;
        businessEmail: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        businessPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        businessAddress: z.ZodOptional<z.ZodObject<{
            address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            province: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            postalCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        }, {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        }>>;
        businessGstHstNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientBusinessName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientEmail: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientAddress: z.ZodOptional<z.ZodObject<{
            address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            province: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            postalCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        }, {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        }>>;
        clientGstHstNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        items: z.ZodOptional<z.ZodArray<z.ZodObject<{
            itemName: z.ZodString;
            description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            quantity: z.ZodDefault<z.ZodNumber>;
            rate: z.ZodNumber;
            taxApplied: z.ZodDefault<z.ZodBoolean>;
            lineTotal: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            quantity: number;
            itemName: string;
            rate: number;
            taxApplied: boolean;
            description?: string | null | undefined;
            lineTotal?: number | undefined;
        }, {
            itemName: string;
            rate: number;
            description?: string | null | undefined;
            quantity?: number | undefined;
            taxApplied?: boolean | undefined;
            lineTotal?: number | undefined;
        }>, "many">>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodOptional<z.ZodEnum<["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]>>;
    }, "strip", z.ZodTypeAny, {
        status?: "CANCELLED" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        dueDate?: string | undefined;
        paymentTerms?: string | null | undefined;
        clientId?: string | null | undefined;
        invoiceNumber?: string | undefined;
        invoiceDate?: string | undefined;
        taxProvince?: string | null | undefined;
        taxRates?: {
            name: string;
            rate: number;
        }[] | undefined;
        businessName?: string | undefined;
        businessEmail?: string | null | undefined;
        businessPhone?: string | null | undefined;
        businessAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        businessGstHstNumber?: string | null | undefined;
        clientBusinessName?: string | null | undefined;
        clientEmail?: string | null | undefined;
        clientPhone?: string | null | undefined;
        clientAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        clientGstHstNumber?: string | null | undefined;
        items?: {
            quantity: number;
            itemName: string;
            rate: number;
            taxApplied: boolean;
            description?: string | null | undefined;
            lineTotal?: number | undefined;
        }[] | undefined;
    }, {
        status?: "CANCELLED" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        dueDate?: string | undefined;
        paymentTerms?: string | null | undefined;
        clientId?: string | null | undefined;
        invoiceNumber?: string | undefined;
        invoiceDate?: string | undefined;
        taxProvince?: string | null | undefined;
        taxRates?: {
            name: string;
            rate: number;
        }[] | undefined;
        businessName?: string | undefined;
        businessEmail?: string | null | undefined;
        businessPhone?: string | null | undefined;
        businessAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        businessGstHstNumber?: string | null | undefined;
        clientBusinessName?: string | null | undefined;
        clientEmail?: string | null | undefined;
        clientPhone?: string | null | undefined;
        clientAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        clientGstHstNumber?: string | null | undefined;
        items?: {
            itemName: string;
            rate: number;
            description?: string | null | undefined;
            quantity?: number | undefined;
            taxApplied?: boolean | undefined;
            lineTotal?: number | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status?: "CANCELLED" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        dueDate?: string | undefined;
        paymentTerms?: string | null | undefined;
        clientId?: string | null | undefined;
        invoiceNumber?: string | undefined;
        invoiceDate?: string | undefined;
        taxProvince?: string | null | undefined;
        taxRates?: {
            name: string;
            rate: number;
        }[] | undefined;
        businessName?: string | undefined;
        businessEmail?: string | null | undefined;
        businessPhone?: string | null | undefined;
        businessAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        businessGstHstNumber?: string | null | undefined;
        clientBusinessName?: string | null | undefined;
        clientEmail?: string | null | undefined;
        clientPhone?: string | null | undefined;
        clientAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        clientGstHstNumber?: string | null | undefined;
        items?: {
            quantity: number;
            itemName: string;
            rate: number;
            taxApplied: boolean;
            description?: string | null | undefined;
            lineTotal?: number | undefined;
        }[] | undefined;
    };
}, {
    body: {
        status?: "CANCELLED" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | undefined;
        currency?: string | undefined;
        notes?: string | null | undefined;
        dueDate?: string | undefined;
        paymentTerms?: string | null | undefined;
        clientId?: string | null | undefined;
        invoiceNumber?: string | undefined;
        invoiceDate?: string | undefined;
        taxProvince?: string | null | undefined;
        taxRates?: {
            name: string;
            rate: number;
        }[] | undefined;
        businessName?: string | undefined;
        businessEmail?: string | null | undefined;
        businessPhone?: string | null | undefined;
        businessAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        businessGstHstNumber?: string | null | undefined;
        clientBusinessName?: string | null | undefined;
        clientEmail?: string | null | undefined;
        clientPhone?: string | null | undefined;
        clientAddress?: {
            city?: string | null | undefined;
            province?: string | null | undefined;
            postalCode?: string | null | undefined;
            address?: string | null | undefined;
        } | undefined;
        clientGstHstNumber?: string | null | undefined;
        items?: {
            itemName: string;
            rate: number;
            description?: string | null | undefined;
            quantity?: number | undefined;
            taxApplied?: boolean | undefined;
            lineTotal?: number | undefined;
        }[] | undefined;
    };
}>;
export declare const invoiceQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]>>;
        clientId: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["invoiceNumber", "invoiceDate", "dueDate", "total"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "total" | "dueDate" | "invoiceNumber" | "invoiceDate";
        sortOrder: "asc" | "desc";
        status?: "CANCELLED" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | undefined;
        search?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        clientId?: string | undefined;
    }, {
        status?: "CANCELLED" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "total" | "dueDate" | "invoiceNumber" | "invoiceDate" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        clientId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "total" | "dueDate" | "invoiceNumber" | "invoiceDate";
        sortOrder: "asc" | "desc";
        status?: "CANCELLED" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | undefined;
        search?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        clientId?: string | undefined;
    };
}, {
    query: {
        status?: "CANCELLED" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | undefined;
        search?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "total" | "dueDate" | "invoiceNumber" | "invoiceDate" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        clientId?: string | undefined;
    };
}>;
export declare const invoiceIdSchema: z.ZodObject<{
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
//# sourceMappingURL=invoices.validators.d.ts.map