import { z } from 'zod';

export const createProductSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        sku: z.string().min(1).max(100),
        slug: z.string().min(1).max(255),
        price: z.coerce.number().min(0),
        compareAtPrice: z.coerce.number().min(0).optional().nullable(),
        costPrice: z.coerce.number().min(0).optional().nullable(),
        currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY']).optional(),
        trackInventory: z.boolean().optional(),
        quantity: z.coerce.number().int().min(0).optional(),
        lowStockThreshold: z.coerce.number().int().min(0).optional().nullable(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
        categoryId: z.string().uuid().optional().nullable(),
        images: z.array(z.string()).optional(),
        metaTitle: z.string().max(255).optional().nullable(),
        metaDescription: z.string().max(500).optional().nullable(),
        weight: z.coerce.number().min(0).optional().nullable(),
        weightUnit: z.string().max(10).optional().nullable(),
    }),
});

export const updateProductSchema = z.object({
    body: createProductSchema.shape.body.partial(),
});

export const productQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
        categoryId: z.string().uuid().optional(),
        search: z.string().optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        sortBy: z.enum(['createdAt', 'name', 'price', 'quantity']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const productIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
