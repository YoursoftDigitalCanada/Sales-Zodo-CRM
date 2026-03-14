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
    // Geometry fields
    pitch: string | null;
    pitchDegrees: number | null;
    stories: number | null;
    roofType: string | null;
    layers: number | null;
    ridgeLengthFt: number | null;
    hipLengthFt: number | null;
    valleyLengthFt: number | null;
    eaveLengthFt: number | null;
    rakeLengthFt: number | null;
    trueSurfaceAreaSqft: number | null;
    measurementSource: string | null;
    tearOffRequired: boolean;
    damageReport: any;
    photoUrls: string[] | null;
    publicToken: string | null;
    takeoffs?: RoofTakeoff[];
    // Segmentation fields
    roofPolygon?: any;
    roofPlanes?: any;
    solarValidated?: boolean;
    correctionFactor?: number | null;
    confidenceScore?: number | null;
    flaggedForReview?: boolean;
    // Wizard workflow fields
    status: string;
    currentStep: number;
    wastePercent: number | null;
    shingleType: string | null;
    shinglePricePerSq: number | null;
    underlaymentCost: number | null;
    iceWaterShieldCost: number | null;
    ridgeCapCost: number | null;
    starterStripCost: number | null;
    flashingCostWizard: number | null;
    ventCostWizard: number | null;
    nailsAccessoriesCost: number | null;
    totalMaterialCost: number | null;
    laborCostPerSquare: number | null;
    numberOfLaborers: number | null;
    daysRequired: number | null;
    laborRatePerWorker: number | null;
    totalLaborCost: number | null;
    dumpsterCost: number | null;
    permitCost: number | null;
    deliveryFee: number | null;
    equipmentRentalCost: number | null;
    disposalFee: number | null;
    totalEquipmentCost: number | null;
    overheadPercent: number | null;
    profitMarginPercent: number | null;
    taxPercent: number | null;
    overheadAmount: number | null;
    profitAmount: number | null;
    taxAmount: number | null;
    finalEstimatePrice: number | null;
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
    locationType: string;
    placeId?: string;
}

export interface ParcelBoundaryResult {
    parcelPolygon: number[][] | null;
    attomPropertyId: string | null;
    lotSize: string | null;
}

export interface PlaceDetailsResult {
    placeId: string;
    formattedAddress: string;
    lat: number;
    lng: number;
    locationType: string;
    types: string[];
    url: string | null;
    viewport: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
    } | null;
}

export interface DetectionResult {
    roofAreaSqft: number;
    confidence: number;
    processingTimeSec: number;
    aiModel: string;
    // HEAT plane detection data (null if HEAT service unavailable)
    heatPlanes: Array<{
        plane_id: number;
        polygon: number[][];
        area_pixels: number;
        centroid: number[];
        num_vertices: number;
    }> | null;
    heatPlaneCount: number;
    heatVertices: number[][] | null;
    heatEdges: number[][] | null;
    heatInferenceTimeSec: number | null;
    heatOriginalImageSize: number[] | null;
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
    // Wizard workflow fields
    status?: string;
    currentStep?: number;
    wastePercent?: number;
    shingleType?: string;
    shinglePricePerSq?: number;
    underlaymentCost?: number;
    iceWaterShieldCost?: number;
    ridgeCapCost?: number;
    starterStripCost?: number;
    flashingCostWizard?: number;
    ventCostWizard?: number;
    nailsAccessoriesCost?: number;
    totalMaterialCost?: number;
    laborCostPerSquare?: number;
    numberOfLaborers?: number;
    daysRequired?: number;
    laborRatePerWorker?: number;
    totalLaborCost?: number;
    dumpsterCost?: number;
    permitCost?: number;
    deliveryFee?: number;
    equipmentRentalCost?: number;
    disposalFee?: number;
    totalEquipmentCost?: number;
    overheadPercent?: number;
    profitMarginPercent?: number;
    taxPercent?: number;
    overheadAmount?: number;
    profitAmount?: number;
    taxAmount?: number;
    finalEstimatePrice?: number;
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

// ── Takeoff Types ────────────────────────────────────────────────────────

export interface RoofTakeoffItem {
    id: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    wasteFactor: number;
    wasteQuantity: number;
    totalQuantity: number;
    totalPrice: number;
    materialId: string | null;
    sortOrder: number;
}

export interface RoofTakeoff {
    id: string;
    estimateId: string;
    scenarioName: string;
    materialType: string;
    wasteFactor: number;
    adjustedAreaSqft: number | null;
    laborRatePerSqft: number | null;
    laborHours: number | null;
    laborCost: number | null;
    materialCost: number | null;
    accessoryCost: number | null;
    tearOffCost: number | null;
    subtotal: number | null;
    markupPercent: number | null;
    profit: number | null;
    totalPrice: number | null;
    items: RoofTakeoffItem[];
    createdAt: string;
}

export interface TakeoffResult {
    takeoffId: string;
    scenarioName: string;
    materialType: string;
    wasteFactor: number;
    adjustedAreaSqft: number;
    items: Array<{
        description: string;
        category: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        wasteFactor: number;
        wasteQuantity: number;
        totalQuantity: number;
        totalPrice: number;
        sortOrder: number;
    }>;
    materialCost: number;
    accessoryCost: number;
    laborHours: number;
    laborCost: number;
    tearOffCost: number;
    subtotal: number;
    markupPercent: number;
    profit: number;
    totalPrice: number;
}

// ── Material Types ───────────────────────────────────────────────────────

export interface RoofMaterial {
    id: string;
    name: string;
    category: string;
    unit: string;
    coveragePerUnit: number;
    defaultPrice: number;
    supplier: string | null;
    sku: string | null;
    isActive: boolean;
}

// ── Labor Rate Types ─────────────────────────────────────────────────────

export interface RoofLaborRate {
    id: string;
    description: string;
    rateType: string;
    rate: number;
    condition: string | null;
    isActive: boolean;
}

// ── Calculator Result Types ──────────────────────────────────────────────

export interface PitchAreaResult {
    planAreaSqft: number;
    pitch: string;
    pitchDegrees: number;
    trueSurfaceAreaSqft: number;
    multiplier: number;
}

export interface LaborResult {
    crewHours: number;
    laborRatePerSqft: number;
    laborCost: number;
    tearOff: {
        laborCost: number;
        dumpsterCost: number;
        total: number;
    } | null;
    grossTotalLabor: number;
}

export interface TotalResult {
    materialCost: number;
    laborCost: number;
    accessoryCost: number;
    tearOffCost: number;
    subtotal: number;
    markupPercent: number;
    profit: number;
    total: number;
    marginPercent: number;
}

// ── Service Functions ────────────────────────────────────────────────────

// ── Existing Endpoints ───────────────────────────────────────────────────

export async function getEstimates(): Promise<RoofEstimate[]> {
    const res = await api.get("/roof-estimator?limit=50&sortBy=createdAt&sortOrder=desc");
    return res.data?.data || [];
}

export async function getEstimateById(id: string): Promise<RoofEstimate> {
    const res = await api.get(`/roof-estimator/${id}`);
    return res.data?.data;
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

export async function fetchSatelliteImage(address: string, placeId: string): Promise<SatelliteResult> {
    const payload = {
        address,
        placeId: placeId.trim(),
    };
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

export interface SegmentationResult {
    found: boolean;
    roof_polygon: number[][];
    mask_area: number;
    overlay_image: string; // base64 PNG
    bbox: number[];
    centroid: number[];
    score: number;
    image_size: number[];
    inference_time_seconds: number;
    message?: string;
}

export async function segmentRoof(satelliteImageUrl: string): Promise<SegmentationResult> {
    const res = await api.post("/roof-estimator/segment-roof", { satelliteImageUrl });
    return res.data?.data;
}

export async function saveEstimate(payload: SaveEstimatePayload): Promise<RoofEstimate> {
    const res = await api.post("/roof-estimator", payload);
    return res.data?.data;
}

export async function updateEstimate(id: string, payload: Partial<SaveEstimatePayload>): Promise<RoofEstimate> {
    const res = await api.put(`/roof-estimator/${id}`, payload);
    return res.data?.data;
}

// ── EagleView Integration ────────────────────────────────────────────────

export interface EagleViewOrderAddress {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
}

export interface EagleViewPlaceOrderResponse {
    orderId: number;
    reportIds: number[];
}

export interface EagleViewReport {
    reportId: number;
    status: string;
    displayStatus?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    datePlaced?: string;
    dateCompleted?: string | null;
    referenceId?: string;
    area?: string;
    pitch?: string;
    lengthRidge?: string;
    lengthValley?: string;
    lengthEave?: string;
    lengthRake?: string;
    lengthHip?: string;
    totalRoofFacets?: string;
    productPrimary?: string;
    reportDownloadLink?: string;
    eligibleForUpgrade?: boolean;
}

export interface EagleViewHealth {
    configured: boolean;
    authenticated: boolean;
    baseUrl: string;
    environment: string;
}

export async function createEagleViewOrder(address: EagleViewOrderAddress, referenceId?: string): Promise<EagleViewPlaceOrderResponse> {
    const res = await api.post("/eagleview/orders", { address, referenceId });
    return res.data?.data;
}

export async function getEagleViewReport(reportId: number): Promise<EagleViewReport> {
    const res = await api.get(`/eagleview/orders/${reportId}`);
    return res.data?.data;
}

export async function getEagleViewHealth(): Promise<EagleViewHealth> {
    const res = await api.get("/eagleview/health");
    return res.data?.data;
}

export async function getEagleViewImagery(lat: number, lng: number): Promise<{ imageUrl: string; captureDate?: string }> {
    const res = await api.get("/eagleview/imagery", { params: { lat, lng } });
    return res.data?.data;
}

/**
 * Fetch EagleView aerial image for a report (via auth-protected proxy).
 * Returns a blob URL that can be used as an img src.
 */
export async function fetchEagleViewImage(reportId: number): Promise<string | null> {
    try {
        const res = await api.get(`/eagleview/orders/${reportId}/image`, { responseType: 'blob' });
        if (res.data && res.data.size > 100) {
            return URL.createObjectURL(res.data);
        }
        return null;
    } catch {
        return null;
    }
}

export async function deleteEstimate(id: string): Promise<void> {
    await api.delete(`/roof-estimator/${id}`);
}

export async function updateEstimateSettings(data: Partial<EstimateSettings>): Promise<void> {
    await api.put("/roof-estimator/settings", data);
}

export async function autocompleteAddress(input: string): Promise<Array<{ description: string; placeId: string }>> {
    const res = await api.get("/roof-estimator/autocomplete", { params: { input } });
    return res.data?.data || [];
}

export async function fetchParcelBoundary(latitude: number, longitude: number): Promise<ParcelBoundaryResult> {
    const res = await api.post("/roof-estimator/parcel-boundary", { latitude, longitude });
    return res.data?.data || { parcelPolygon: null, attomPropertyId: null, lotSize: null };
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
    const res = await api.post("/roof-estimator/place-details", { placeId });
    return res.data?.data;
}

/**
 * Returns the Google Maps JS API key for frontend interactive map.
 * This is the same key used for satellite/geocoding on the backend,
 * exposed via a lightweight config endpoint or hardcoded from env.
 */
export function getGoogleMapsJsApiKey(): string {
    // The API key is exposed through the satellite image URL.
    // We extract it from there or use the env variable.
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
}

// ── Material Estimation Engine ───────────────────────────────────────────

export interface MaterialLineItem {
    item: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
}

export interface MaterialEstimate {
    roofAreaSq: number;
    roofAreaSqFt: number;
    wasteFactor: number;
    adjustedSq: number;
    complexity: string;
    pitch: string;
    materials: MaterialLineItem[];
    materialCost: number;
    laborCost: number;
    removalCost: number;
    subtotal: number;
    tax: number;
    totalEstimate: number;
    roofPlanes: number;
    ridgeLengthFt: number;
    valleyLengthFt: number;
    eaveLengthFt: number;
    rakeLengthFt: number;
    hipLengthFt: number;
}

export async function calculateMaterials(reportData: {
    area?: string | number;
    pitch?: string;
    lengthRidge?: string | number;
    lengthHip?: string | number;
    lengthValley?: string | number;
    lengthEave?: string | number;
    lengthRake?: string | number;
    totalRoofFacets?: string | number;
}): Promise<MaterialEstimate> {
    const res = await api.post("/roof-estimator/calculate-materials", { reportData });
    return res.data?.data;
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

// ── F3: Manual Entry ─────────────────────────────────────────────────────

export async function manualEntry(payload: {
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
}): Promise<RoofEstimate> {
    const res = await api.post("/roof-estimator/manual-entry", payload);
    return res.data?.data;
}

// ── F4: Pitch-Adjusted Area ──────────────────────────────────────────────

export async function calculateArea(roofAreaSqft: number, pitch: string): Promise<PitchAreaResult> {
    const res = await api.post("/roof-estimator/calculate-area", { roofAreaSqft, pitch });
    return res.data?.data;
}

// ── F5 & F9: Material Takeoff ────────────────────────────────────────────

export async function generateTakeoff(payload: {
    estimateId: string;
    materialType: string;
    scenarioName?: string;
    wasteFactor?: number;
    markupPercent?: number;
    customLaborRate?: number;
}): Promise<TakeoffResult> {
    const res = await api.post("/roof-estimator/takeoff", payload);
    return res.data?.data;
}

export async function generateScenarios(payload: {
    estimateId: string;
    materialTypes: string[];
    wasteFactor?: number;
    markupPercent?: number;
}): Promise<TakeoffResult[]> {
    const res = await api.post("/roof-estimator/takeoff/scenarios", payload);
    return res.data?.data || [];
}

export async function getTakeoffsByEstimate(estimateId: string): Promise<RoofTakeoff[]> {
    const res = await api.get(`/roof-estimator/takeoff/estimate/${estimateId}`);
    return res.data?.data || [];
}

export async function deleteTakeoff(id: string): Promise<void> {
    await api.delete(`/roof-estimator/takeoff/${id}`);
}

// ── F7: Labor Calculator ─────────────────────────────────────────────────

export async function calculateLabor(payload: {
    areaSqft: number;
    pitch?: string;
    stories?: number;
    tearOff?: boolean;
    layers?: number;
    materialType?: string;
}): Promise<LaborResult> {
    const res = await api.post("/roof-estimator/calculate-labor", payload);
    return res.data?.data;
}

// ── F8: Supplier Pricing (Materials) ─────────────────────────────────────

export async function getMaterials(category?: string): Promise<RoofMaterial[]> {
    const params = category ? { category } : {};
    const res = await api.get("/roof-estimator/materials", { params });
    return res.data?.data || [];
}

export async function createMaterial(data: {
    name: string;
    category: string;
    unit: string;
    coveragePerUnit: number;
    defaultPrice: number;
    supplier?: string;
    sku?: string;
}): Promise<RoofMaterial> {
    const res = await api.post("/roof-estimator/materials", data);
    return res.data?.data;
}

export async function updateMaterial(id: string, data: Partial<RoofMaterial>): Promise<RoofMaterial> {
    const res = await api.put(`/roof-estimator/materials/${id}`, data);
    return res.data?.data;
}

export async function deleteMaterial(id: string): Promise<void> {
    await api.delete(`/roof-estimator/materials/${id}`);
}

// ── F7: Labor Rates ──────────────────────────────────────────────────────

export async function getLaborRates(): Promise<RoofLaborRate[]> {
    const res = await api.get("/roof-estimator/labor-rates");
    return res.data?.data || [];
}

export async function createLaborRate(data: {
    description: string;
    rateType: string;
    rate: number;
    condition?: string;
}): Promise<RoofLaborRate> {
    const res = await api.post("/roof-estimator/labor-rates", data);
    return res.data?.data;
}

export async function updateLaborRate(id: string, data: Partial<RoofLaborRate>): Promise<RoofLaborRate> {
    const res = await api.put(`/roof-estimator/labor-rates/${id}`, data);
    return res.data?.data;
}

export async function deleteLaborRate(id: string): Promise<void> {
    await api.delete(`/roof-estimator/labor-rates/${id}`);
}

// ── F10: Total + Markup Calculator ───────────────────────────────────────

export async function calculateTotal(payload: {
    materialCost: number;
    laborCost: number;
    accessoryCost?: number;
    tearOffCost?: number;
    markupPercent: number;
}): Promise<TotalResult> {
    const res = await api.post("/roof-estimator/calculate-total", payload);
    return res.data?.data;
}

// ── Nearmap AI Extraction ────────────────────────────────────────────────

export interface RoofData {
    id: string;
    clientId: string;
    tenantId: string;
    source: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    buildingOutline: any;
    roofOutline: any;
    propertyInsights: any;
    areaSqFt: number | null;
    rawApiResponse: any;
    createdAt: string;
    updatedAt: string;
}

export interface NearmapExtractResult {
    cached: boolean;
    roofData: RoofData;
}

export async function fetchNearmapData(payload: {
    clientId: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    forceRefresh?: boolean;
}): Promise<NearmapExtractResult> {
    const res = await api.post("/roof-estimator/nearmap-extract", payload);
    return res.data?.data;
}

export async function getRoofDataByClient(clientId: string): Promise<RoofData[]> {
    const res = await api.get(`/roof-estimator/roof-data/${clientId}`);
    return res.data?.data || [];
}

export interface NearmapCoverage {
    hasCoverage: boolean;
    latestSurveyDate: string | null;
    packs: string[];
}

export async function checkNearmapCoverage(latitude: number, longitude: number): Promise<NearmapCoverage> {
    const res = await api.get("/roof-estimator/nearmap-coverage", {
        params: { latitude, longitude },
    });
    return res.data?.data;
}

// ── AI Segmentation + Geometry Detection (Upgraded Pipeline) ─────────────

export interface RoofPlane {
    id: string;
    areaSqft: number;
    pitchDegrees: number;
    azimuthDegrees: number;
    centroid: [number, number];
}

export interface RoofEdge {
    type: 'ridge' | 'valley' | 'hip' | 'eave' | 'rake';
    start: [number, number];
    end: [number, number];
    lengthFt: number;
    planeIds: string[];
}

export interface RoofMeasurements {
    roofAreaSqft: number;
    trueSurfaceAreaSqft: number;
    roofSquares: number;
    ridgeLengthFt: number;
    valleyLengthFt: number;
    hipLengthFt: number;
    eaveLengthFt: number;
    rakeLengthFt: number;
    perimeterFt: number;
    polygon: { type: string; coordinates: number[][][] };
    planes: RoofPlane[];
    edges: RoofEdge[];
    confidenceScore: number;
    flaggedForReview: boolean;
}

export interface RoofValidationResult {
    valid: boolean;
    errorPercent: number;
    correctionFactor: number;
    action: 'accept' | 'correct' | 'flag_review';
    blendedAreaSqft?: number;
    solarAreaSqft: number;
    aiAreaSqft: number;
}

export interface SegmentedDetectionResult {
    measurements: RoofMeasurements;
    solarInsights: any | null;  // internal-only (used for area validation)
    validation: RoofValidationResult | null;
    aiModel: string;
    processingTimeSec: number;
}

export async function detectSegmented(payload: {
    latitude: number;
    longitude: number;
    address?: string;
    estimateId?: string;
    zoom?: number;
    imageSize?: number;
    roofType?: string;
}): Promise<SegmentedDetectionResult> {
    const res = await api.post("/roof-estimator/detect-segmented", payload);
    return res.data?.data;
}

export async function validatePolygon(aiAreaSqft: number, solarAreaSqft: number): Promise<RoofValidationResult> {
    const res = await api.post("/roof-estimator/validate-polygon", { aiAreaSqft, solarAreaSqft });
    return res.data?.data;
}
