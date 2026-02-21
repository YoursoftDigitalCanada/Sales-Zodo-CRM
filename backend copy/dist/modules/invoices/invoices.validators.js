"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceIdSchema = exports.invoiceQuerySchema = exports.updateInvoiceSchema = exports.createInvoiceSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// INVOICES - Create Invoice
// ============================================================================
const invoiceItemSchema = zod_1.z.object({
    itemName: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional().nullable(),
    quantity: zod_1.z.number().min(0).default(1),
    rate: zod_1.z.number().min(0),
    taxApplied: zod_1.z.boolean().default(false),
    lineTotal: zod_1.z.number().min(0).optional(),
});
const addressSchema = zod_1.z.object({
    address: zod_1.z.string().max(255).optional().nullable(),
    city: zod_1.z.string().max(100).optional().nullable(),
    province: zod_1.z.string().max(100).optional().nullable(),
    postalCode: zod_1.z.string().max(20).optional().nullable(),
});
exports.createInvoiceSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Invoice Details
        invoiceNumber: zod_1.z.string().min(1).max(50),
        invoiceDate: zod_1.z.string().datetime(),
        paymentTerms: zod_1.z.string().max(50).optional().nullable(),
        dueDate: zod_1.z.string().datetime(),
        currency: zod_1.z.string().length(3).default('CAD'),
        taxProvince: zod_1.z.string().max(50).optional().nullable(),
        taxRates: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            rate: zod_1.z.number().min(0).max(100),
        })).default([]),
        // Business (Billed By)
        businessName: zod_1.z.string().min(1).max(255),
        businessEmail: zod_1.z.string().email().optional().nullable(),
        businessPhone: zod_1.z.string().max(30).optional().nullable(),
        businessAddress: addressSchema.optional(),
        businessGstHstNumber: zod_1.z.string().max(50).optional().nullable(),
        // Client (Billed To) - either existing clientId or new client info
        clientId: zod_1.z.string().uuid().optional().nullable(),
        clientBusinessName: zod_1.z.string().max(255).optional().nullable(),
        clientEmail: zod_1.z.string().email().optional().nullable(),
        clientPhone: zod_1.z.string().max(30).optional().nullable(),
        clientAddress: addressSchema.optional(),
        clientGstHstNumber: zod_1.z.string().max(50).optional().nullable(),
        // Invoice Items
        items: zod_1.z.array(invoiceItemSchema).min(1),
        // Notes
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.updateInvoiceSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Invoice Details
        invoiceNumber: zod_1.z.string().min(1).max(50).optional(),
        invoiceDate: zod_1.z.string().datetime().optional(),
        paymentTerms: zod_1.z.string().max(50).optional().nullable(),
        dueDate: zod_1.z.string().datetime().optional(),
        currency: zod_1.z.string().length(3).optional(),
        taxProvince: zod_1.z.string().max(50).optional().nullable(),
        taxRates: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            rate: zod_1.z.number().min(0).max(100),
        })).optional(),
        // Business (Billed By)
        businessName: zod_1.z.string().min(1).max(255).optional(),
        businessEmail: zod_1.z.string().email().optional().nullable(),
        businessPhone: zod_1.z.string().max(30).optional().nullable(),
        businessAddress: addressSchema.optional(),
        businessGstHstNumber: zod_1.z.string().max(50).optional().nullable(),
        // Client (Billed To)
        clientId: zod_1.z.string().uuid().optional().nullable(),
        clientBusinessName: zod_1.z.string().max(255).optional().nullable(),
        clientEmail: zod_1.z.string().email().optional().nullable(),
        clientPhone: zod_1.z.string().max(30).optional().nullable(),
        clientAddress: addressSchema.optional(),
        clientGstHstNumber: zod_1.z.string().max(50).optional().nullable(),
        // Invoice Items
        items: zod_1.z.array(invoiceItemSchema).optional(),
        // Notes
        notes: zod_1.z.string().optional().nullable(),
        // Status
        status: zod_1.z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
    }),
});
exports.invoiceQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        status: zod_1.z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
        clientId: zod_1.z.string().uuid().optional(),
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        sortBy: zod_1.z.enum(['invoiceNumber', 'invoiceDate', 'dueDate', 'total']).default('invoiceDate'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.invoiceIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=invoices.validators.js.map