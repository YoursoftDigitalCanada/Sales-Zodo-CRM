import { z } from 'zod';

export const satelliteRequestSchema = z.object({
    body: z.object({
        address: z.string().min(5, 'Address is required and must be at least 5 characters'),
        placeId: z.string().min(3).max(255).optional(),
    }),
});

export const detectRoofSchema = z.object({
    body: z.object({
        satelliteImageUrl: z.string().url('Valid satellite image URL required'),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
    }),
});

export const createEstimateSchema = z.object({
    body: z.object({
        address: z.string().min(5),
        latitude: z.number(),
        longitude: z.number(),
        satelliteImageUrl: z.string().optional(),
        roofAreaSqft: z.number().positive(),
        confidence: z.number().min(0).max(100),
        processingTimeSec: z.number().optional(),
        aiModel: z.string().optional(),
        pricePerSqft: z.number().min(0),
        manualAdjustment: z.number().min(-50).max(100).optional(),
        totalEstimate: z.number().min(0),
        snowMode: z.boolean().optional(),
        notes: z.string().max(2000).optional(),
        clientId: z.string().uuid().optional(),
    }),
});

export const updateEstimateSchema = z.object({
    body: z.object({
        pricePerSqft: z.number().min(0).optional(),
        manualAdjustment: z.number().min(-50).max(100).optional(),
        totalEstimate: z.number().min(0).optional(),
        snowMode: z.boolean().optional(),
        notes: z.string().max(2000).optional(),
        clientId: z.string().uuid().optional().nullable(),
    }),
});

export const estimateIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const estimateQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        search: z.string().optional(),
        clientId: z.string().uuid().optional(),
        sortBy: z.enum(['createdAt', 'totalEstimate', 'roofAreaSqft', 'address']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
});

export const updateSettingsSchema = z.object({
    body: z.object({
        defaultPricePerSqft: z.number().min(0).optional(),
        currency: z.string().length(3).optional(),
        snowModeDefault: z.boolean().optional(),
        companyName: z.string().max(200).optional(),
        companyLogo: z.string().max(500).optional(),
        companyPhone: z.string().max(20).optional(),
        companyEmail: z.string().email().optional(),
        companyAddress: z.string().max(500).optional(),
        pdfFooterText: z.string().max(1000).optional(),
    }),
});

export const generateEstimateSchema = z.object({
    body: z.object({
        roofAreaSqft: z.number().positive('Roof area must be positive'),
        roofType: z.string().min(1),
        material: z.string().min(1),
        location: z.string().optional(),
        stories: z.number().min(1).max(5).optional().default(1),
        pitch: z.string().optional(),
        currentCondition: z.string().optional(),
    }),
});
