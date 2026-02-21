"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLeadSchema = exports.leadIdSchema = exports.leadQuerySchema = exports.updateLeadSchema = exports.createLeadSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// LEADS - Add New Lead
// ============================================================================
exports.createLeadSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Basic Info
        firstName: zod_1.z.string().min(1).max(100),
        lastName: zod_1.z.string().min(1).max(100),
        email: zod_1.z.string().email(),
        phone: zod_1.z.string().max(30).optional().nullable(),
        location: zod_1.z.string().max(255).optional().nullable(),
        // Company Info
        companyName: zod_1.z.string().min(1).max(255),
        jobTitle: zod_1.z.string().max(100).optional().nullable(),
        website: zod_1.z.string().url().optional().nullable(),
        // Lead Details
        leadSource: zod_1.z.string().max(100).optional().nullable(),
        status: zod_1.z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
        temperature: zod_1.z.enum(['COLD', 'WARM', 'HOT']).default('COLD'),
        potentialValue: zod_1.z.number().min(0).optional().nullable(),
        assignedTo: zod_1.z.string().uuid().optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string()).default([]),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.updateLeadSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Basic Info
        firstName: zod_1.z.string().min(1).max(100).optional(),
        lastName: zod_1.z.string().min(1).max(100).optional(),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().max(30).optional().nullable(),
        location: zod_1.z.string().max(255).optional().nullable(),
        // Company Info
        companyName: zod_1.z.string().min(1).max(255).optional(),
        jobTitle: zod_1.z.string().max(100).optional().nullable(),
        website: zod_1.z.string().url().optional().nullable(),
        // Lead Details
        leadSource: zod_1.z.string().max(100).optional().nullable(),
        status: zod_1.z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
        temperature: zod_1.z.enum(['COLD', 'WARM', 'HOT']).optional(),
        potentialValue: zod_1.z.number().min(0).optional().nullable(),
        assignedTo: zod_1.z.string().uuid().optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.leadQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        status: zod_1.z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
        temperature: zod_1.z.enum(['COLD', 'WARM', 'HOT']).optional(),
        assignedTo: zod_1.z.string().uuid().optional(),
        leadSource: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['firstName', 'createdAt', 'potentialValue', 'companyName']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.leadIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
exports.convertLeadSchema = zod_1.z.object({
    body: zod_1.z.object({
        createClient: zod_1.z.boolean().default(true),
        clientType: zod_1.z.enum(['BUSINESS', 'INDIVIDUAL']).default('BUSINESS'),
    }),
});
//# sourceMappingURL=leads.validators.js.map