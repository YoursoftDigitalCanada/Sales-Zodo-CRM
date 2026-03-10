// DTO types for Roof Estimator module

// ── Satellite & Detection ─────────────────────────────────────────────────

export interface SatelliteRequestDto {
    address: string;
    placeId?: string;
}

export interface DetectRoofDto {
    satelliteImageUrl: string;
    latitude: number;
    longitude: number;
}

// ── Manual Entry ──────────────────────────────────────────────────────────

export interface ManualEntryDto {
    address: string;
    latitude: number;
    longitude: number;
    roofAreaSqft: number;
    pitch?: string;
    roofType?: string;
    stories?: number;
    layers?: number;
    ridgeLengthFt?: number;
    hipLengthFt?: number;
    valleyLengthFt?: number;
    eaveLengthFt?: number;
    rakeLengthFt?: number;
    clientId?: string;
    notes?: string;
}

// ── Estimate CRUD ─────────────────────────────────────────────────────────

export interface CreateEstimateDto {
    address: string;
    latitude: number;
    longitude: number;
    satelliteImageUrl?: string;
    roofAreaSqft: number;
    confidence: number;
    processingTimeSec?: number;
    aiModel?: string;
    pricePerSqft: number;
    manualAdjustment?: number;
    totalEstimate: number;
    snowMode?: boolean;
    notes?: string;
    clientId?: string;
    // New fields
    pitch?: string;
    roofType?: string;
    stories?: number;
    layers?: number;
    ridgeLengthFt?: number;
    hipLengthFt?: number;
    valleyLengthFt?: number;
    eaveLengthFt?: number;
    rakeLengthFt?: number;
    measurementSource?: string;
    tearOffRequired?: boolean;
    photoUrls?: string[];
    // Stage 3: Estimator Request Fields
    desiredNewMaterial?: string;
    preferredManufacturer?: string;
    qualityTier?: string;
    additionalPhotoUrls?: string[];
}

export interface UpdateEstimateDto {
    pricePerSqft?: number;
    manualAdjustment?: number;
    totalEstimate?: number;
    snowMode?: boolean;
    notes?: string;
    clientId?: string;
    // New fields
    pitch?: string;
    roofType?: string;
    stories?: number;
    layers?: number;
    ridgeLengthFt?: number;
    hipLengthFt?: number;
    valleyLengthFt?: number;
    eaveLengthFt?: number;
    rakeLengthFt?: number;
    tearOffRequired?: boolean;
}

export interface EstimateQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    clientId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ── Settings ──────────────────────────────────────────────────────────────

export interface UpdateSettingsDto {
    defaultPricePerSqft?: number;
    currency?: string;
    snowModeDefault?: boolean;
    companyName?: string;
    companyLogo?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyAddress?: string;
    pdfFooterText?: string;
}

// ── Material Takeoff ──────────────────────────────────────────────────────

export interface GenerateTakeoffDto {
    estimateId: string;
    materialType: string;
    scenarioName?: string;
    wasteFactor?: number;
    markupPercent?: number;
    customLaborRate?: number;
}

export interface GenerateScenariosDto {
    estimateId: string;
    materialTypes: string[];
    wasteFactor?: number;
    markupPercent?: number;
}

// ── Supplier Pricing (Materials CRUD) ─────────────────────────────────────

export interface CreateMaterialDto {
    name: string;
    category: string;
    unit: string;
    coveragePerUnit: number;
    defaultPrice: number;
    supplier?: string;
    sku?: string;
}

export interface UpdateMaterialDto {
    name?: string;
    category?: string;
    unit?: string;
    coveragePerUnit?: number;
    defaultPrice?: number;
    supplier?: string;
    sku?: string;
    isActive?: boolean;
}

// ── Labor Rates CRUD ──────────────────────────────────────────────────────

export interface CreateLaborRateDto {
    description: string;
    rateType: string;
    rate: number;
    condition?: string;
}

export interface UpdateLaborRateDto {
    description?: string;
    rateType?: string;
    rate?: number;
    condition?: string;
    isActive?: boolean;
}

// ── Cost Calculation ──────────────────────────────────────────────────────

export interface CalculateTotalDto {
    materialCost: number;
    laborCost: number;
    accessoryCost?: number;
    tearOffCost?: number;
    markupPercent: number;
}

export interface CalculateAreaDto {
    roofAreaSqft: number;
    pitch: string;
}

export interface CalculateLaborDto {
    areaSqft: number;
    pitch?: string;
    stories?: number;
    tearOff?: boolean;
    layers?: number;
    materialType?: string;
}
