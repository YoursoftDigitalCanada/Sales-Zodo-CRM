import { z } from 'zod';
import {
    CANADIAN_PHONE_VALIDATION_MESSAGE,
    EMAIL_VALIDATION_MESSAGE,
    PERSON_NAME_VALIDATION_MESSAGE,
    isValidCanadianPhoneNumber,
    isValidEmailAddress,
    isValidPersonName,
} from '@contracts/contact';

const preferredContactMethodSchema = z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim();
    if (normalized === 'Phone Call' || normalized === 'Phone') return 'Call';
    if (normalized === 'Text' || normalized === 'SMS') return 'WhatsApp';
    return normalized;
}, z.enum(['Email', 'Call', 'WhatsApp']).optional().nullable());

// ============================================================================
// CONTACTS - Add Contact
// ============================================================================

export const createContactSchema = z.object({
    body: z.object({
        contactName: z.string().trim().min(1).max(255).refine(isValidPersonName, `Contact name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional(),
        companyId: z.string().uuid().optional().nullable(),
        dealId: z.string().uuid().optional().nullable(),
        type: z.enum(['CLIENT', 'LEAD']).default('CLIENT'),
        jobTitle: z.string().max(100).optional().nullable(),
        department: z.string().max(100).optional().nullable(),
        email: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE),
        officePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        mobilePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        linkedInUrl: z.string().url().optional().nullable(),
        isPrimaryContact: z.boolean().default(false),
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        relationshipStatus: z.enum(['Active', 'Inactive']).optional().nullable(),
        roleInBuyingProcess: z.enum(['Decision Maker', 'Influencer', 'User', 'Gatekeeper']).optional().nullable(),
        seniorityLevel: z.enum(['Manager', 'Director', 'VP', 'CXO', 'Owner', 'Individual Contributor']).optional().nullable(),
        buyingAuthorityScore: z.enum(['Low', 'Medium', 'High', '1', '2', '3', '4', '5']).optional().nullable(),
        secondaryEmail: z.string().trim().refine((value) => !value || isValidEmailAddress(value), EMAIL_VALIDATION_MESSAGE).optional().nullable(),
        alternatePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        preferredContactMethod: preferredContactMethodSchema,
        timeZone: z.string().max(100).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
        tags: z.array(z.string().max(50)).optional(),
        assignedToId: z.string().uuid().optional().nullable(),
        lastContactedAt: z.string().datetime().optional().nullable(),
        totalInteractions: z.number().int().min(0).optional(),
        lastActivityType: z.string().max(100).optional().nullable(),
    }).refine((data) => Boolean(data.companyId || data.dealId), {
        message: 'Contact must be linked to an Account or Deal',
        path: ['companyId'],
    }).refine((data) => Boolean(data.officePhone || data.mobilePhone), {
        message: 'Contact must include a phone number',
        path: ['officePhone'],
    }),
});

export const updateContactSchema = z.object({
    body: z.object({
        contactName: z.string().trim().min(1).max(255).refine(isValidPersonName, `Contact name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional(),
        companyId: z.string().uuid().optional().nullable(),
        dealId: z.string().uuid().optional().nullable(),
        type: z.enum(['CLIENT', 'LEAD']).optional(),
        jobTitle: z.string().max(100).optional().nullable(),
        department: z.string().max(100).optional().nullable(),
        email: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE).optional(),
        officePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        mobilePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        linkedInUrl: z.string().url().optional().nullable(),
        isPrimaryContact: z.boolean().optional(),
        firstName: z.string().max(100).optional().nullable(),
        lastName: z.string().max(100).optional().nullable(),
        relationshipStatus: z.enum(['Active', 'Inactive']).optional().nullable(),
        roleInBuyingProcess: z.enum(['Decision Maker', 'Influencer', 'User', 'Gatekeeper']).optional().nullable(),
        seniorityLevel: z.enum(['Manager', 'Director', 'VP', 'CXO', 'Owner', 'Individual Contributor']).optional().nullable(),
        buyingAuthorityScore: z.enum(['Low', 'Medium', 'High', '1', '2', '3', '4', '5']).optional().nullable(),
        secondaryEmail: z.string().trim().refine((value) => !value || isValidEmailAddress(value), EMAIL_VALIDATION_MESSAGE).optional().nullable(),
        alternatePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        preferredContactMethod: preferredContactMethodSchema,
        timeZone: z.string().max(100).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
        tags: z.array(z.string().max(50)).optional(),
        assignedToId: z.string().uuid().optional().nullable(),
        lastContactedAt: z.string().datetime().optional().nullable(),
        totalInteractions: z.number().int().min(0).optional(),
        lastActivityType: z.string().max(100).optional().nullable(),
    }),
});

export const contactQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        companyId: z.string().uuid().optional(),
        type: z.enum(['CLIENT', 'LEAD']).optional(),
        isPrimaryContact: z.coerce.boolean().optional(),
        sortBy: z.enum(['contactName', 'createdAt', 'email']).default('contactName'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }),
});

export const contactIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
