import { z } from 'zod';
export declare const createLeadSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        email: z.ZodString;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        companyName: z.ZodString;
        jobTitle: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        website: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        leadSource: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodDefault<z.ZodEnum<["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]>>;
        temperature: z.ZodDefault<z.ZodEnum<["COLD", "WARM", "HOT"]>>;
        potentialValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        assignedTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
        email: string;
        tags: string[];
        firstName: string;
        lastName: string;
        companyName: string;
        temperature: "COLD" | "WARM" | "HOT";
        leadSource?: string | null | undefined;
        phone?: string | null | undefined;
        location?: string | null | undefined;
        jobTitle?: string | null | undefined;
        website?: string | null | undefined;
        potentialValue?: number | null | undefined;
        notes?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }, {
        email: string;
        firstName: string;
        lastName: string;
        companyName: string;
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        leadSource?: string | null | undefined;
        tags?: string[] | undefined;
        phone?: string | null | undefined;
        location?: string | null | undefined;
        jobTitle?: string | null | undefined;
        website?: string | null | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        potentialValue?: number | null | undefined;
        notes?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
        email: string;
        tags: string[];
        firstName: string;
        lastName: string;
        companyName: string;
        temperature: "COLD" | "WARM" | "HOT";
        leadSource?: string | null | undefined;
        phone?: string | null | undefined;
        location?: string | null | undefined;
        jobTitle?: string | null | undefined;
        website?: string | null | undefined;
        potentialValue?: number | null | undefined;
        notes?: string | null | undefined;
        assignedTo?: string | null | undefined;
    };
}, {
    body: {
        email: string;
        firstName: string;
        lastName: string;
        companyName: string;
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        leadSource?: string | null | undefined;
        tags?: string[] | undefined;
        phone?: string | null | undefined;
        location?: string | null | undefined;
        jobTitle?: string | null | undefined;
        website?: string | null | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        potentialValue?: number | null | undefined;
        notes?: string | null | undefined;
        assignedTo?: string | null | undefined;
    };
}>;
export declare const updateLeadSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        companyName: z.ZodOptional<z.ZodString>;
        jobTitle: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        website: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        leadSource: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodOptional<z.ZodEnum<["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]>>;
        temperature: z.ZodOptional<z.ZodEnum<["COLD", "WARM", "HOT"]>>;
        potentialValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        assignedTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        email?: string | undefined;
        leadSource?: string | null | undefined;
        tags?: string[] | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | null | undefined;
        location?: string | null | undefined;
        companyName?: string | undefined;
        jobTitle?: string | null | undefined;
        website?: string | null | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        potentialValue?: number | null | undefined;
        notes?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }, {
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        email?: string | undefined;
        leadSource?: string | null | undefined;
        tags?: string[] | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | null | undefined;
        location?: string | null | undefined;
        companyName?: string | undefined;
        jobTitle?: string | null | undefined;
        website?: string | null | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        potentialValue?: number | null | undefined;
        notes?: string | null | undefined;
        assignedTo?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        email?: string | undefined;
        leadSource?: string | null | undefined;
        tags?: string[] | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | null | undefined;
        location?: string | null | undefined;
        companyName?: string | undefined;
        jobTitle?: string | null | undefined;
        website?: string | null | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        potentialValue?: number | null | undefined;
        notes?: string | null | undefined;
        assignedTo?: string | null | undefined;
    };
}, {
    body: {
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        email?: string | undefined;
        leadSource?: string | null | undefined;
        tags?: string[] | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phone?: string | null | undefined;
        location?: string | null | undefined;
        companyName?: string | undefined;
        jobTitle?: string | null | undefined;
        website?: string | null | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        potentialValue?: number | null | undefined;
        notes?: string | null | undefined;
        assignedTo?: string | null | undefined;
    };
}>;
export declare const leadQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        search: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]>>;
        temperature: z.ZodOptional<z.ZodEnum<["COLD", "WARM", "HOT"]>>;
        assignedTo: z.ZodOptional<z.ZodString>;
        leadSource: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["firstName", "createdAt", "potentialValue", "companyName"]>>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: "createdAt" | "firstName" | "companyName" | "potentialValue";
        sortOrder: "asc" | "desc";
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        search?: string | undefined;
        leadSource?: string | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        assignedTo?: string | undefined;
    }, {
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        search?: string | undefined;
        leadSource?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "firstName" | "companyName" | "potentialValue" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        assignedTo?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        sortBy: "createdAt" | "firstName" | "companyName" | "potentialValue";
        sortOrder: "asc" | "desc";
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        search?: string | undefined;
        leadSource?: string | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        assignedTo?: string | undefined;
    };
}, {
    query: {
        status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | undefined;
        search?: string | undefined;
        leadSource?: string | undefined;
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: "createdAt" | "firstName" | "companyName" | "potentialValue" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        temperature?: "COLD" | "WARM" | "HOT" | undefined;
        assignedTo?: string | undefined;
    };
}>;
export declare const leadIdSchema: z.ZodObject<{
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
export declare const convertLeadSchema: z.ZodObject<{
    body: z.ZodObject<{
        createClient: z.ZodDefault<z.ZodBoolean>;
        clientType: z.ZodDefault<z.ZodEnum<["BUSINESS", "INDIVIDUAL"]>>;
    }, "strip", z.ZodTypeAny, {
        clientType: "INDIVIDUAL" | "BUSINESS";
        createClient: boolean;
    }, {
        clientType?: "INDIVIDUAL" | "BUSINESS" | undefined;
        createClient?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        clientType: "INDIVIDUAL" | "BUSINESS";
        createClient: boolean;
    };
}, {
    body: {
        clientType?: "INDIVIDUAL" | "BUSINESS" | undefined;
        createClient?: boolean | undefined;
    };
}>;
//# sourceMappingURL=leads.validators.d.ts.map