import { z } from 'zod';

// ============================================================================
// INVOICES - Create Invoice
// ============================================================================

const invoiceItemSchema = z.object({
    itemName: z.string().min(1).max(255),
    description: z.string().optional().nullable(),
    quantity: z.number().min(0).default(1),
    rate: z.number().min(0),
    taxApplied: z.boolean().default(false),
    lineTotal: z.number().min(0).optional(),
});

const addressSchema = z.object({
    address: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    province: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(20).optional().nullable(),
});

export const createInvoiceSchema = z.object({
    body: z.object({
        // Invoice Details
        invoiceNumber: z.string().min(1).max(50),
        invoiceDate: z.string().datetime(),
        paymentTerms: z.string().max(50).optional().nullable(),
        dueDate: z.string().datetime(),
        currency: z.string().length(3).default('CAD'),
        taxProvince: z.string().max(50).optional().nullable(),
        taxRates: z.array(z.object({
            name: z.string(),
            rate: z.number().min(0).max(100),
        })).default([]),

        // Business (Billed By)
        businessName: z.string().min(1).max(255),
        businessEmail: z.string().email().optional().nullable(),
        businessPhone: z.string().max(30).optional().nullable(),
        businessAddress: addressSchema.optional(),
        businessGstHstNumber: z.string().max(50).optional().nullable(),

        // Client (Billed To) - either existing clientId or new client info
        clientId: z.string().uuid().optional().nullable(),
        clientBusinessName: z.string().max(255).optional().nullable(),
        clientEmail: z.string().email().optional().nullable(),
        clientPhone: z.string().max(30).optional().nullable(),
        clientAddress: addressSchema.optional(),
        clientGstHstNumber: z.string().max(50).optional().nullable(),

        // Invoice Items
        items: z.array(invoiceItemSchema).min(1),

        // Notes
        notes: z.string().optional().nullable(),
    }),
});

export const updateInvoiceSchema = z.object({
    body: z.object({
        // Invoice Details
        invoiceNumber: z.string().min(1).max(50).optional(),
        invoiceDate: z.string().datetime().optional(),
        paymentTerms: z.string().max(50).optional().nullable(),
        dueDate: z.string().datetime().optional(),
        currency: z.string().length(3).optional(),
        taxProvince: z.string().max(50).optional().nullable(),
        taxRates: z.array(z.object({
            name: z.string(),
            rate: z.number().min(0).max(100),
        })).optional(),

        // Business (Billed By)
        businessName: z.string().min(1).max(255).optional(),
        businessEmail: z.string().email().optional().nullable(),
        businessPhone: z.string().max(30).optional().nullable(),
        businessAddress: addressSchema.optional(),
        businessGstHstNumber: z.string().max(50).optional().nullable(),

        // Client (Billed To)
        clientId: z.string().uuid().optional().nullable(),
        clientBusinessName: z.string().max(255).optional().nullable(),
        clientEmail: z.string().email().optional().nullable(),
        clientPhone: z.string().max(30).optional().nullable(),
        clientAddress: addressSchema.optional(),
        clientGstHstNumber: z.string().max(50).optional().nullable(),

        // Invoice Items
        items: z.array(invoiceItemSchema).optional(),

        // Notes
        notes: z.string().optional().nullable(),

        // Status
        status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
    }),
});

export const invoiceQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
        clientId: z.string().uuid().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        sortBy: z.enum(['invoiceNumber', 'invoiceDate', 'dueDate', 'total']).default('invoiceDate'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const invoiceIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
