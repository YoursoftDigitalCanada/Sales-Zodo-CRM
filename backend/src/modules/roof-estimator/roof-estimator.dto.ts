// DTO types for Roof Estimator module

export interface SatelliteRequestDto {
    address: string;
}

export interface DetectRoofDto {
    satelliteImageUrl: string;
    latitude: number;
    longitude: number;
}

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
}

export interface UpdateEstimateDto {
    pricePerSqft?: number;
    manualAdjustment?: number;
    totalEstimate?: number;
    snowMode?: boolean;
    notes?: string;
    clientId?: string;
}

export interface EstimateQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    clientId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

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
