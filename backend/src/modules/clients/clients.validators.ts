import { z } from 'zod';
import {
    CANADIAN_PHONE_VALIDATION_MESSAGE,
    CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE,
    EMAIL_VALIDATION_MESSAGE,
    PERSON_NAME_VALIDATION_MESSAGE,
    isValidCanadianPhoneNumber,
    isValidCanadianPostalCode,
    isValidEmailAddress,
    isValidPersonName,
} from '@contracts/contact';

// ============================================================================
// CLIENTS - Add New Client
// ============================================================================

const createClientBodySchema = z.object({
        // 1️⃣ Basic Information
        clientLogo: z.string().url().optional().nullable(),
        clientName: z.string().trim().min(1).max(255),
        companyName: z.string().max(255).optional().nullable(),
        clientType: z.enum(['BUSINESS', 'INDIVIDUAL']).default('BUSINESS'),
        primaryEmail: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE),
        primaryPhone: z.string().trim().min(1).max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE),
        status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
        assignedOwner: z.string().uuid().optional().nullable(),
        website: z.string().trim().max(255).optional().nullable(),
        noOfEmployees: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).default('1-10'),
        annualRevenue: z.number().min(0).optional().nullable(),
        exchangeRate: z.number().positive().optional().nullable(),
        industry: z.string().max(100).optional().nullable(),
        territory: z.string().max(100).optional().nullable(),
        organizationAddress: z.string().max(500).optional().nullable(),

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
        postalCode: z.string().trim().max(20).refine(isValidCanadianPostalCode, CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE).optional().nullable(),
        country: z.string().max(100).optional().nullable(),

        // 4️⃣ Internal Notes
        internalNotes: z.string().optional().nullable(),

        // 5️⃣ Primary Contact
        contactName: z.string().trim().max(255).refine(isValidPersonName, `Contact name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        directPhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),

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
        secondaryPhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        spouseCoOwnerName: z.string().trim().max(200).refine(isValidPersonName, `Spouse / co-owner name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional().nullable(),
    })
    .superRefine((value, ctx) => {
        if (value.clientType === 'INDIVIDUAL' && !isValidPersonName(value.clientName)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['clientName'],
                message: `Client name ${PERSON_NAME_VALIDATION_MESSAGE}`,
            });
        }
    });

export const createClientSchema = z.object({
    body: createClientBodySchema,
});

const updateClientBodySchema = z.object({
        // 1️⃣ Basic Information
        clientLogo: z.string().url().optional().nullable(),
        clientName: z.string().trim().min(1).max(255).optional(),
        companyName: z.string().max(255).optional().nullable(),
        clientType: z.enum(['BUSINESS', 'INDIVIDUAL']).optional(),
        primaryEmail: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE).optional(),
        primaryPhone: z.string().trim().min(1).max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
        assignedOwner: z.string().uuid().optional().nullable(),
        website: z.string().trim().max(255).optional().nullable(),
        noOfEmployees: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional().nullable(),
        annualRevenue: z.number().min(0).optional().nullable(),
        exchangeRate: z.number().positive().optional().nullable(),
        industry: z.string().max(100).optional().nullable(),
        territory: z.string().max(100).optional().nullable(),
        organizationAddress: z.string().max(500).optional().nullable(),

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
        postalCode: z.string().trim().max(20).refine(isValidCanadianPostalCode, CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE).optional().nullable(),
        country: z.string().max(100).optional().nullable(),

        // 4️⃣ Internal Notes
        internalNotes: z.string().optional().nullable(),

        // 5️⃣ Primary Contact
        contactName: z.string().trim().max(255).refine(isValidPersonName, `Contact name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        directPhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),

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
        secondaryPhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        spouseCoOwnerName: z.string().trim().max(200).refine(isValidPersonName, `Spouse / co-owner name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional().nullable(),
    })
    .superRefine((value, ctx) => {
        if (value.clientType === 'INDIVIDUAL' && value.clientName && !isValidPersonName(value.clientName)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['clientName'],
                message: `Client name ${PERSON_NAME_VALIDATION_MESSAGE}`,
            });
        }
    });

export const updateClientSchema = z.object({
    body: updateClientBodySchema,
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
