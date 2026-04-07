import { z } from 'zod';
import {
    CANADIAN_PHONE_VALIDATION_MESSAGE,
    EMAIL_VALIDATION_MESSAGE,
    PERSON_NAME_VALIDATION_MESSAGE,
    isValidCanadianPhoneNumber,
    isValidEmailAddress,
    isValidPersonName,
} from '@contracts/contact';

// ============================================================================
// CONTACTS - Add Contact
// ============================================================================

export const createContactSchema = z.object({
    body: z.object({
        contactName: z.string().trim().min(1).max(255).refine(isValidPersonName, `Contact name ${PERSON_NAME_VALIDATION_MESSAGE}`),
        companyId: z.string().uuid().optional().nullable(),
        type: z.enum(['CLIENT', 'LEAD']).default('CLIENT'),
        jobTitle: z.string().max(100).optional().nullable(),
        department: z.string().max(100).optional().nullable(),
        email: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE),
        officePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        mobilePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        linkedInUrl: z.string().url().optional().nullable(),
        isPrimaryContact: z.boolean().default(false),
    }),
});

export const updateContactSchema = z.object({
    body: z.object({
        contactName: z.string().trim().min(1).max(255).refine(isValidPersonName, `Contact name ${PERSON_NAME_VALIDATION_MESSAGE}`).optional(),
        companyId: z.string().uuid().optional().nullable(),
        type: z.enum(['CLIENT', 'LEAD']).optional(),
        jobTitle: z.string().max(100).optional().nullable(),
        department: z.string().max(100).optional().nullable(),
        email: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE).optional(),
        officePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        mobilePhone: z.string().trim().max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE).optional().nullable(),
        linkedInUrl: z.string().url().optional().nullable(),
        isPrimaryContact: z.boolean().optional(),
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
