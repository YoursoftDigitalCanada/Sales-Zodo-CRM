"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientIdSchema = exports.clientQuerySchema = exports.updateClientSchema = exports.createClientSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// CLIENTS - Add New Client
// ============================================================================
exports.createClientSchema = zod_1.z.object({
    body: zod_1.z.object({
        // 1️⃣ Basic Information
        clientLogo: zod_1.z.string().url().optional().nullable(),
        clientName: zod_1.z.string().min(1).max(255),
        companyName: zod_1.z.string().max(255).optional().nullable(),
        clientType: zod_1.z.enum(['BUSINESS', 'INDIVIDUAL']).default('BUSINESS'),
        primaryEmail: zod_1.z.string().email(),
        primaryPhone: zod_1.z.string().min(1).max(30),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
        assignedOwner: zod_1.z.string().uuid().optional().nullable(),
        // 2️⃣ Business & Tax Details
        gstHstNumber: zod_1.z.string().max(50).optional().nullable(),
        pstQstNumber: zod_1.z.string().max(50).optional().nullable(),
        businessStructure: zod_1.z.string().max(100).optional().nullable(),
        corpRegistrationNumber: zod_1.z.string().max(100).optional().nullable(),
        // 3️⃣ Billing Address
        streetAddress: zod_1.z.string().max(255).optional().nullable(),
        suite: zod_1.z.string().max(50).optional().nullable(),
        city: zod_1.z.string().max(100).optional().nullable(),
        province: zod_1.z.string().max(100).optional().nullable(),
        postalCode: zod_1.z.string().max(20).optional().nullable(),
        country: zod_1.z.string().max(100).optional().nullable(),
        // 4️⃣ Internal Notes
        internalNotes: zod_1.z.string().optional().nullable(),
        // 5️⃣ Primary Contact
        contactName: zod_1.z.string().max(255).optional().nullable(),
        position: zod_1.z.string().max(100).optional().nullable(),
        directPhone: zod_1.z.string().max(30).optional().nullable(),
        // 6️⃣ Financial Settings
        creditLimit: zod_1.z.number().min(0).optional().nullable(),
        paymentTerms: zod_1.z.string().max(50).optional().nullable(),
        currency: zod_1.z.string().length(3).default('CAD'),
        // 7️⃣ Categorization
        leadSource: zod_1.z.string().max(100).optional().nullable(),
        clientCategory: zod_1.z.string().max(100).optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string()).default([]),
    }),
});
exports.updateClientSchema = zod_1.z.object({
    body: zod_1.z.object({
        // 1️⃣ Basic Information
        clientLogo: zod_1.z.string().url().optional().nullable(),
        clientName: zod_1.z.string().min(1).max(255).optional(),
        companyName: zod_1.z.string().max(255).optional().nullable(),
        clientType: zod_1.z.enum(['BUSINESS', 'INDIVIDUAL']).optional(),
        primaryEmail: zod_1.z.string().email().optional(),
        primaryPhone: zod_1.z.string().min(1).max(30).optional(),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
        assignedOwner: zod_1.z.string().uuid().optional().nullable(),
        // 2️⃣ Business & Tax Details
        gstHstNumber: zod_1.z.string().max(50).optional().nullable(),
        pstQstNumber: zod_1.z.string().max(50).optional().nullable(),
        businessStructure: zod_1.z.string().max(100).optional().nullable(),
        corpRegistrationNumber: zod_1.z.string().max(100).optional().nullable(),
        // 3️⃣ Billing Address
        streetAddress: zod_1.z.string().max(255).optional().nullable(),
        suite: zod_1.z.string().max(50).optional().nullable(),
        city: zod_1.z.string().max(100).optional().nullable(),
        province: zod_1.z.string().max(100).optional().nullable(),
        postalCode: zod_1.z.string().max(20).optional().nullable(),
        country: zod_1.z.string().max(100).optional().nullable(),
        // 4️⃣ Internal Notes
        internalNotes: zod_1.z.string().optional().nullable(),
        // 5️⃣ Primary Contact
        contactName: zod_1.z.string().max(255).optional().nullable(),
        position: zod_1.z.string().max(100).optional().nullable(),
        directPhone: zod_1.z.string().max(30).optional().nullable(),
        // 6️⃣ Financial Settings
        creditLimit: zod_1.z.number().min(0).optional().nullable(),
        paymentTerms: zod_1.z.string().max(50).optional().nullable(),
        currency: zod_1.z.string().length(3).optional(),
        // 7️⃣ Categorization
        leadSource: zod_1.z.string().max(100).optional().nullable(),
        clientCategory: zod_1.z.string().max(100).optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.clientQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        clientType: zod_1.z.enum(['BUSINESS', 'INDIVIDUAL']).optional(),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
        assignedOwner: zod_1.z.string().uuid().optional(),
        clientCategory: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['clientName', 'createdAt', 'primaryEmail']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.clientIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=clients.validators.js.map