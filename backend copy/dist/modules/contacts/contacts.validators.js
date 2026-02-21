"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactIdSchema = exports.contactQuerySchema = exports.updateContactSchema = exports.createContactSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// CONTACTS - Add Contact
// ============================================================================
exports.createContactSchema = zod_1.z.object({
    body: zod_1.z.object({
        contactName: zod_1.z.string().min(1).max(255),
        companyId: zod_1.z.string().uuid().optional().nullable(),
        type: zod_1.z.enum(['CLIENT', 'LEAD']).default('CLIENT'),
        jobTitle: zod_1.z.string().max(100).optional().nullable(),
        department: zod_1.z.string().max(100).optional().nullable(),
        email: zod_1.z.string().email(),
        officePhone: zod_1.z.string().max(30).optional().nullable(),
        mobilePhone: zod_1.z.string().max(30).optional().nullable(),
        linkedInUrl: zod_1.z.string().url().optional().nullable(),
        isPrimaryContact: zod_1.z.boolean().default(false),
    }),
});
exports.updateContactSchema = zod_1.z.object({
    body: zod_1.z.object({
        contactName: zod_1.z.string().min(1).max(255).optional(),
        companyId: zod_1.z.string().uuid().optional().nullable(),
        type: zod_1.z.enum(['CLIENT', 'LEAD']).optional(),
        jobTitle: zod_1.z.string().max(100).optional().nullable(),
        department: zod_1.z.string().max(100).optional().nullable(),
        email: zod_1.z.string().email().optional(),
        officePhone: zod_1.z.string().max(30).optional().nullable(),
        mobilePhone: zod_1.z.string().max(30).optional().nullable(),
        linkedInUrl: zod_1.z.string().url().optional().nullable(),
        isPrimaryContact: zod_1.z.boolean().optional(),
    }),
});
exports.contactQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        companyId: zod_1.z.string().uuid().optional(),
        type: zod_1.z.enum(['CLIENT', 'LEAD']).optional(),
        isPrimaryContact: zod_1.z.coerce.boolean().optional(),
        sortBy: zod_1.z.enum(['contactName', 'createdAt', 'email']).default('contactName'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
    }),
});
exports.contactIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=contacts.validators.js.map