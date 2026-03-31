import { z } from 'zod';

// ── Pitch pattern (e.g. "6/12", "10/12") ──────────────────────────────────
const pitchSchema = z.string().regex(/^\d{1,2}(\.\d+)?\/12$/, 'Pitch must be in X/12 format').optional();
const roofTypeSchema = z.string().trim().min(1).max(50).optional();
const materialTypeSchema = z.enum(['asphalt', 'metal', 'tile', 'tpo', 'cedar']);
const estimatePhotoSchema = z.object({
    label: z.string().min(1).max(100),
    url: z.string().min(1),
});
const materialCategorySchema = z.enum([
    'shingles', 'underlayment', 'starter', 'cap', 'drip_edge',
    'flashing', 'ice_shield', 'vent', 'nails', 'boot', 'snow_guard',
]);

// ── Existing Schemas (unchanged) ──────────────────────────────────────────

export const satelliteRequestSchema = z.object({
    body: z.object({
        address: z.string().min(5, 'Address is required and must be at least 5 characters'),
        placeId: z.string().max(255).optional(),
    }),
});

export const detectRoofSchema = z.object({
    body: z.object({
        satelliteImageUrl: z.string().url('Valid satellite image URL required'),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
    }),
});

// Shared wizard field validations
const wizardFieldsSchema = {
    status: z.enum(['draft', 'completed', 'sent']).optional(),
    currentStep: z.number().int().min(1).max(7).optional(),
    wastePercent: z.number().min(0).max(100).optional(),
    shingleType: z.string().max(200).optional(),
    shinglePricePerSq: z.number().min(0).optional(),
    underlaymentCost: z.number().min(0).optional(),
    iceWaterShieldCost: z.number().min(0).optional(),
    ridgeCapCost: z.number().min(0).optional(),
    starterStripCost: z.number().min(0).optional(),
    flashingCostWizard: z.number().min(0).optional(),
    ventCostWizard: z.number().min(0).optional(),
    nailsAccessoriesCost: z.number().min(0).optional(),
    totalMaterialCost: z.number().min(0).optional(),
    laborCostPerSquare: z.number().min(0).optional(),
    numberOfLaborers: z.number().int().min(0).optional(),
    daysRequired: z.number().int().min(0).optional(),
    laborRatePerWorker: z.number().min(0).optional(),
    totalLaborCost: z.number().min(0).optional(),
    dumpsterCost: z.number().min(0).optional(),
    permitCost: z.number().min(0).optional(),
    deliveryFee: z.number().min(0).optional(),
    equipmentRentalCost: z.number().min(0).optional(),
    disposalFee: z.number().min(0).optional(),
    totalEquipmentCost: z.number().min(0).optional(),
    overheadPercent: z.number().min(0).max(100).optional(),
    profitMarginPercent: z.number().min(0).max(100).optional(),
    taxPercent: z.number().min(0).max(100).optional(),
    overheadAmount: z.number().min(0).optional(),
    profitAmount: z.number().min(0).optional(),
    taxAmount: z.number().min(0).optional(),
    finalEstimatePrice: z.number().min(0).optional(),
};

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
        clientId: z.string().uuid().optional().nullable(),
        leadId: z.string().uuid().optional().nullable(),
        // New fields
        pitch: pitchSchema,
        roofType: roofTypeSchema,
        stories: z.number().int().min(1).max(5).optional(),
        layers: z.number().int().min(1).max(5).optional(),
        ridgeLengthFt: z.number().min(0).optional(),
        hipLengthFt: z.number().min(0).optional(),
        valleyLengthFt: z.number().min(0).optional(),
        eaveLengthFt: z.number().min(0).optional(),
        rakeLengthFt: z.number().min(0).optional(),
        measurementSource: z.union([z.enum(['ai_satellite', 'ai_photo', 'eagleview', 'manual', 'ai_segmented']), z.literal('')]).optional().transform(v => v === '' ? undefined : v),
        tearOffRequired: z.boolean().optional(),
        photoUrls: z.array(z.union([z.string().min(1), estimatePhotoSchema])).max(10).optional(),
        // Wizard fields
        ...wizardFieldsSchema,
    }),
});

export const updateEstimateSchema = z.object({
    body: z.object({
        address: z.string().min(5).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        satelliteImageUrl: z.string().optional(),
        roofAreaSqft: z.number().positive().optional(),
        confidence: z.number().min(0).max(100).optional(),
        processingTimeSec: z.number().optional(),
        aiModel: z.string().optional(),
        pricePerSqft: z.number().min(0).optional(),
        manualAdjustment: z.number().min(-50).max(100).optional(),
        totalEstimate: z.number().min(0).optional(),
        snowMode: z.boolean().optional(),
        notes: z.string().max(2000).optional(),
        clientId: z.string().uuid().optional().nullable(),
        leadId: z.string().uuid().optional().nullable(),
        // New fields
        pitch: pitchSchema,
        roofType: roofTypeSchema,
        stories: z.number().int().min(1).max(5).optional(),
        layers: z.number().int().min(1).max(5).optional(),
        ridgeLengthFt: z.number().min(0).optional(),
        hipLengthFt: z.number().min(0).optional(),
        valleyLengthFt: z.number().min(0).optional(),
        eaveLengthFt: z.number().min(0).optional(),
        rakeLengthFt: z.number().min(0).optional(),
        tearOffRequired: z.boolean().optional(),
        measurementSource: z.union([z.enum(['ai_satellite', 'ai_photo', 'eagleview', 'manual', 'ai_segmented']), z.literal('')]).optional().transform(v => v === '' ? undefined : v),
        photoUrls: z.array(z.union([z.string().min(1), estimatePhotoSchema])).max(10).optional(),
        // Wizard fields
        ...wizardFieldsSchema,
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
        leadId: z.string().uuid().optional(),
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

// ── New Schemas ───────────────────────────────────────────────────────────

export const manualEntrySchema = z.object({
    body: z.object({
        address: z.string().min(5),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        roofAreaSqft: z.number().positive(),
        pitch: pitchSchema,
        roofType: roofTypeSchema,
        stories: z.number().int().min(1).max(5).optional(),
        layers: z.number().int().min(1).max(5).optional(),
        ridgeLengthFt: z.number().min(0).optional(),
        hipLengthFt: z.number().min(0).optional(),
        valleyLengthFt: z.number().min(0).optional(),
        eaveLengthFt: z.number().min(0).optional(),
        rakeLengthFt: z.number().min(0).optional(),
        clientId: z.string().uuid().optional(),
        notes: z.string().max(2000).optional(),
    }),
});

export const calculateAreaSchema = z.object({
    body: z.object({
        roofAreaSqft: z.number().positive(),
        pitch: z.string().regex(/^\d{1,2}(\.\d+)?\/12$/),
    }),
});

export const calculateLaborSchema = z.object({
    body: z.object({
        areaSqft: z.number().positive(),
        pitch: z.string().optional(),
        stories: z.number().int().min(1).max(5).optional(),
        tearOff: z.boolean().optional(),
        layers: z.number().int().min(1).max(5).optional(),
        materialType: materialTypeSchema.optional(),
    }),
});

export const calculateTotalSchema = z.object({
    body: z.object({
        materialCost: z.number().min(0),
        laborCost: z.number().min(0),
        accessoryCost: z.number().min(0).optional(),
        tearOffCost: z.number().min(0).optional(),
        markupPercent: z.number().min(0).max(100),
    }),
});

export const generateTakeoffSchema = z.object({
    body: z.object({
        estimateId: z.string().uuid(),
        materialType: materialTypeSchema,
        scenarioName: z.string().max(100).optional(),
        wasteFactor: z.number().min(0).max(50).optional(),
        markupPercent: z.number().min(0).max(100).optional(),
        customLaborRate: z.number().min(0).optional(),
    }),
});

export const generateScenariosSchema = z.object({
    body: z.object({
        estimateId: z.string().uuid(),
        materialTypes: z.array(materialTypeSchema).min(1).max(5),
        wasteFactor: z.number().min(0).max(50).optional(),
        markupPercent: z.number().min(0).max(100).optional(),
    }),
});

// ── Material CRUD ─────────────────────────────────────────────────────────

export const createMaterialSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(200),
        category: materialCategorySchema,
        unit: z.string().min(1).max(50),
        coveragePerUnit: z.number().positive(),
        defaultPrice: z.number().min(0),
        supplier: z.string().max(200).optional(),
        sku: z.string().max(50).optional(),
    }),
});

export const updateMaterialSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(200).optional(),
        category: materialCategorySchema.optional(),
        unit: z.string().min(1).max(50).optional(),
        coveragePerUnit: z.number().positive().optional(),
        defaultPrice: z.number().min(0).optional(),
        supplier: z.string().max(200).optional(),
        sku: z.string().max(50).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const materialIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

// ── Labor Rate CRUD ───────────────────────────────────────────────────────

export const createLaborRateSchema = z.object({
    body: z.object({
        description: z.string().min(1).max(200),
        rateType: z.enum(['per_sqft', 'per_hour', 'flat']),
        rate: z.number().min(0),
        condition: z.string().max(200).optional(),
    }),
});

export const updateLaborRateSchema = z.object({
    body: z.object({
        description: z.string().min(1).max(200).optional(),
        rateType: z.enum(['per_sqft', 'per_hour', 'flat']).optional(),
        rate: z.number().min(0).optional(),
        condition: z.string().max(200).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const laborRateIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

// ── Takeoff Query ─────────────────────────────────────────────────────────

export const takeoffsByEstimateSchema = z.object({
    params: z.object({
        estimateId: z.string().uuid(),
    }),
});

export const takeoffIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

// ── Nearmap AI Extraction ─────────────────────────────────────────────────

export const nearmapExtractSchema = z.object({
    body: z.object({
        clientId: z.string().uuid('Valid client ID required'),
        address: z.string().min(5).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        forceRefresh: z.boolean().optional(),
    }).refine(
        (data) => (data.latitude && data.longitude) || data.address,
        { message: 'Either address or latitude/longitude is required' }
    ),
});

export const roofDataByClientSchema = z.object({
    params: z.object({
        clientId: z.string().uuid(),
    }),
});

// ── Solar API + Segmentation (upgraded pipeline) ──────────────────────────

export const solarInsightsSchema = z.object({
    body: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().optional(),
        estimateId: z.string().uuid().optional(),
    }),
});

export const detectSegmentedSchema = z.object({
    body: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().optional(),
        estimateId: z.string().uuid().optional(),
        zoom: z.number().int().min(15).max(22).optional(),
        imageSize: z.number().int().min(256).max(2048).optional(),
        roofType: roofTypeSchema,
    }),
});

export const validatePolygonSchema = z.object({
    body: z.object({
        aiAreaSqft: z.number().positive('AI area must be positive'),
        solarAreaSqft: z.number().positive('Solar area must be positive'),
    }),
});

// ── Place Details (Google Places API) ─────────────────────────────────────

export const placeDetailsSchema = z.object({
    body: z.object({
        placeId: z.string().min(3, 'Place ID is required').max(255),
    }),
});

// ── Parcel Boundary (ATTOM API proxy) ─────────────────────────────────────

export const parcelBoundarySchema = z.object({
    body: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
    }),
});
