import { z } from 'zod';

const orderItemSchema = z.object({
    productId: z.string().uuid(),
    productName: z.string().min(1).max(255),
    productSku: z.string().min(1).max(100),
    quantity: z.coerce.number().int().min(1),
    unitPrice: z.coerce.number().min(0),
    total: z.coerce.number().min(0),
});

export const createOrderSchema = z.object({
    body: z.object({
        orderNumber: z.string().min(1).max(100),
        clientId: z.string().uuid().optional().nullable(),
        customerEmail: z.string().email(),
        customerName: z.string().min(1).max(255),
        customerPhone: z.string().max(50).optional().nullable(),
        billingAddress: z.record(z.any()),
        shippingAddress: z.record(z.any()),
        currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY']).optional(),
        subtotal: z.coerce.number().min(0),
        taxAmount: z.coerce.number().min(0).optional(),
        shippingAmount: z.coerce.number().min(0).optional(),
        discountAmount: z.coerce.number().min(0).optional(),
        total: z.coerce.number().min(0),
        paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'PAYPAL', 'STRIPE', 'OTHER']).optional().nullable(),
        shippingMethod: z.string().max(255).optional().nullable(),
        notes: z.string().optional().nullable(),
        internalNotes: z.string().optional().nullable(),
        items: z.array(orderItemSchema).min(1),
    }),
});

export const updateOrderSchema = z.object({
    body: z.object({
        status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED']).optional(),
        paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'PAYPAL', 'STRIPE', 'OTHER']).optional().nullable(),
        paymentStatus: z.string().max(50).optional(),
        trackingNumber: z.string().max(255).optional().nullable(),
        shippingMethod: z.string().max(255).optional().nullable(),
        notes: z.string().optional().nullable(),
        internalNotes: z.string().optional().nullable(),
    }),
});

export const orderQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED']).optional(),
        clientId: z.string().uuid().optional(),
        customerEmail: z.string().email().optional(),
        paymentStatus: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(['createdAt', 'total', 'orderNumber']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const orderIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
