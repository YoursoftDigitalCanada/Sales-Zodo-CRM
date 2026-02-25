import api from "@/lib/axios";

// ── Types ────────────────────────────────────────────────────────────────

export interface RoofEstimate {
    id: string;
    address: string;
    latitude: number;
    longitude: number;
    satelliteImageUrl: string | null;
    roofAreaSqft: number;
    confidence: number;
    processingTimeSec: number;
    aiModel: string;
    pricePerSqft: number;
    manualAdjustment: number;
    totalEstimate: number;
    snowMode: boolean;
    notes: string | null;
    clientId: string | null;
    createdAt: string;
    client?: { id: string; clientName: string; companyName: string | null } | null;
}

export interface EstimateSettings {
    defaultPricePerSqft: number;
    currency: string;
    snowModeDefault: boolean;
    companyName: string | null;
}

export interface EstimateStatistics {
    totalEstimates: number;
    totalRevenue: number;
    avgRoofArea: number;
    avgConfidence: number;
}

export interface SatelliteResult {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    satelliteImageUrl: string;
}

export interface DetectionResult {
    roofAreaSqft: number;
    confidence: number;
    processingTimeSec: number;
    aiModel: string;
}

export interface SaveEstimatePayload {
    address: string;
    latitude: number;
    longitude: number;
    satelliteImageUrl: string;
    roofAreaSqft: number;
    confidence: number;
    processingTimeSec: number;
    aiModel: string;
    pricePerSqft: number;
    manualAdjustment: number;
    totalEstimate: number;
    snowMode: boolean;
    notes?: string;
    clientId?: string;
}

// ── Service Functions ────────────────────────────────────────────────────

export async function getEstimates(): Promise<RoofEstimate[]> {
    const res = await api.get("/roof-estimator?limit=50&sortBy=createdAt&sortOrder=desc");
    return res.data?.data || [];
}

export async function getEstimateSettings(): Promise<EstimateSettings | null> {
    const res = await api.get("/roof-estimator/settings");
    return res.data?.data || null;
}

export async function getEstimateStatistics(): Promise<EstimateStatistics | null> {
    const res = await api.get("/roof-estimator/statistics");
    return res.data?.data || null;
}

export async function checkAiHealth(): Promise<boolean> {
    const res = await api.get("/roof-estimator/ai-health");
    return res.data?.data?.healthy || false;
}

export async function fetchSatelliteImage(address: string, placeId?: string): Promise<SatelliteResult> {
    const payload: Record<string, string> = { address };
    if (placeId && placeId.trim()) {
        payload.placeId = placeId.trim();
    }
    const res = await api.post("/roof-estimator/satellite", payload);
    return res.data?.data;
}

export async function detectRoof(payload: {
    satelliteImageUrl: string;
    latitude: number;
    longitude: number;
}): Promise<DetectionResult> {
    const res = await api.post("/roof-estimator/detect", payload);
    return res.data?.data;
}

export async function saveEstimate(payload: SaveEstimatePayload): Promise<RoofEstimate> {
    const res = await api.post("/roof-estimator", payload);
    return res.data?.data;
}

export async function deleteEstimate(id: string): Promise<void> {
    await api.delete(`/roof-estimator/${id}`);
}

export async function updateEstimateSettings(data: Partial<EstimateSettings>): Promise<void> {
    await api.put("/roof-estimator/settings", data);
}

/**
 * Autocomplete address suggestions (Google Places)
 */
export async function autocompleteAddress(input: string): Promise<Array<{ description: string; placeId: string }>> {
    const res = await api.get("/roof-estimator/autocomplete", { params: { input } });
    return res.data?.data || [];
}

export interface EstimateBreakdownItem {
    item: string;
    quantity?: string;
    unitPrice?: number;
    total: number;
}

export interface GeneratedEstimate {
    summary: string;
    laborCost: number;
    materialCost: number;
    totalEstimate: number;
    breakdown: EstimateBreakdownItem[];
    timeline: string;
    notes: string[];
}

export async function generateEstimate(params: {
    roofAreaSqft: number;
    roofType: string;
    material: string;
    location?: string;
    stories?: number;
    pitch?: string;
    currentCondition?: string;
}): Promise<GeneratedEstimate> {
    const res = await api.post("/roof-estimator/generate-estimate", params);
    return res.data?.data || res.data;
}
