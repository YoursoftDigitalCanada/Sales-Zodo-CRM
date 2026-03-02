import { z } from 'zod';

// ============================================================================
// CLIENTS - Add New Client
// ============================================================================

export const createClientSchema = z.object({
    body: z.object({
        // 1️⃣ Basic Information
        clientLogo: z.string().url().optional().nullable(),
        clientName: z.string().min(1).max(255),
        companyName: z.string().max(255).optional().nullable(),
        clientType: z.enum(['BUSINESS', 'INDIVIDUAL']).default('BUSINESS'),
        primaryEmail: z.string().email(),
        primaryPhone: z.string().min(1).max(30),
        status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
        assignedOwner: z.string().uuid().optional().nullable(),

        // 2️⃣ Business & Tax Details
        gstHstNumber: z.string().max(50).optional().nullable(),
        pstQstNumber: z.string().max(50).optional().nullable(),
        businessStructure: z.string().max(100).optional().nullable(),
        corpRegistrationNumber: z.string().max(100).optional().nullable(),

        // 3️⃣ Billing Address
        streetAddress: z.string().max(255).optional().nullable(),
        suite: z.string().max(50).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        province: z.string().max(100).optional().nullable(),
        postalCode: z.string().max(20).optional().nullable(),
        country: z.string().max(100).optional().nullable(),

        // 4️⃣ Internal Notes
        internalNotes: z.string().optional().nullable(),

        // 5️⃣ Primary Contact
        contactName: z.string().max(255).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        directPhone: z.string().max(30).optional().nullable(),

        // 6️⃣ Financial Settings
        creditLimit: z.number().min(0).optional().nullable(),
        paymentTerms: z.string().max(50).optional().nullable(),
        currency: z.string().length(3).default('CAD'),

        // 7️⃣ Categorization
        leadSource: z.string().max(100).optional().nullable(),
        clientCategory: z.string().max(100).optional().nullable(),
        tags: z.array(z.string()).default([]),

        // 8️⃣ Property Information
        propertyType: z.string().max(100).optional().nullable(),
        numberOfStories: z.string().max(10).optional().nullable(),

        // 9️⃣ Service Details
        serviceType: z.string().max(200).optional().nullable(),
        preferredContactMethod: z.string().max(50).optional().nullable(),
        bestTimeToContact: z.string().max(50).optional().nullable(),

        // 🔟 Roof Details
        currentRoofMaterial: z.string().max(100).optional().nullable(),
        roofAge: z.string().max(50).optional().nullable(),

        // 1️⃣1️⃣ Insurance Info
        insuranceCompanyName: z.string().max(200).optional().nullable(),
        isInsuranceClaim: z.string().max(20).optional().nullable(),

        // 1️⃣2️⃣ Ownership & HOA
        isHomeowner: z.string().max(20).optional().nullable(),
        isHOA: z.string().max(20).optional().nullable(),
        hoaRestrictions: z.string().max(2000).optional().nullable(),

        // 1️⃣3️⃣ Secondary Contact
        secondaryPhone: z.string().max(30).optional().nullable(),
        spouseCoOwnerName: z.string().max(200).optional().nullable(),
    }),
});

export const updateClientSchema = z.object({
    body: z.object({
        // 1️⃣ Basic Information
        clientLogo: z.string().url().optional().nullable(),
        clientName: z.string().min(1).max(255).optional(),
        companyName: z.string().max(255).optional().nullable(),
        clientType: z.enum(['BUSINESS', 'INDIVIDUAL']).optional(),
        primaryEmail: z.string().email().optional(),
        primaryPhone: z.string().min(1).max(30).optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
        assignedOwner: z.string().uuid().optional().nullable(),

        // 2️⃣ Business & Tax Details
        gstHstNumber: z.string().max(50).optional().nullable(),
        pstQstNumber: z.string().max(50).optional().nullable(),
        businessStructure: z.string().max(100).optional().nullable(),
        corpRegistrationNumber: z.string().max(100).optional().nullable(),

        // 3️⃣ Billing Address
        streetAddress: z.string().max(255).optional().nullable(),
        suite: z.string().max(50).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        province: z.string().max(100).optional().nullable(),
        postalCode: z.string().max(20).optional().nullable(),
        country: z.string().max(100).optional().nullable(),

        // 4️⃣ Internal Notes
        internalNotes: z.string().optional().nullable(),

        // 5️⃣ Primary Contact
        contactName: z.string().max(255).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        directPhone: z.string().max(30).optional().nullable(),

        // 6️⃣ Financial Settings
        creditLimit: z.number().min(0).optional().nullable(),
        paymentTerms: z.string().max(50).optional().nullable(),
        currency: z.string().length(3).optional(),

        // 7️⃣ Categorization
        leadSource: z.string().max(100).optional().nullable(),
        clientCategory: z.string().max(100).optional().nullable(),
        tags: z.array(z.string()).optional(),

        // 8️⃣ Property Information
        propertyType: z.string().max(100).optional().nullable(),
        numberOfStories: z.string().max(10).optional().nullable(),

        // 9️⃣ Service Details
        serviceType: z.string().max(200).optional().nullable(),
        preferredContactMethod: z.string().max(50).optional().nullable(),
        bestTimeToContact: z.string().max(50).optional().nullable(),

        // 🔟 Roof Details
        currentRoofMaterial: z.string().max(100).optional().nullable(),
        roofAge: z.string().max(50).optional().nullable(),

        // 1️⃣1️⃣ Insurance Info
        insuranceCompanyName: z.string().max(200).optional().nullable(),
        isInsuranceClaim: z.string().max(20).optional().nullable(),

        // 1️⃣2️⃣ Ownership & HOA
        isHomeowner: z.string().max(20).optional().nullable(),
        isHOA: z.string().max(20).optional().nullable(),
        hoaRestrictions: z.string().max(2000).optional().nullable(),

        // 1️⃣3️⃣ Secondary Contact
        secondaryPhone: z.string().max(30).optional().nullable(),
        spouseCoOwnerName: z.string().max(200).optional().nullable(),
    }),
});

export const clientQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        clientType: z.enum(['BUSINESS', 'INDIVIDUAL']).optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
        assignedOwner: z.string().uuid().optional(),
        clientCategory: z.string().optional(),
        sortBy: z.enum(['clientName', 'createdAt', 'primaryEmail']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const clientIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
