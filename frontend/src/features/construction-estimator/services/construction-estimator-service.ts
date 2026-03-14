import api from '@/lib/axios';

// ── Types ──

export interface EstimateMeasurement {
    id?: string;
    roofArea: number | null;
    ridgeLength: number | null;
    valleyLength: number | null;
    hipLength: number | null;
    eaveLength: number | null;
    rakeLength: number | null;
    pitch: string | null;
    facets: number | null;
    roofPlanes: number | null;
    totalPerimeter: number | null;
    source: string;
    eagleViewOrderId?: string | null;
    eagleViewReportId?: string | null;
}

export interface EstimateMaterial {
    id?: string;
    materialName: string;
    materialCategory: string;
    quantity: number;
    unit: string;
    ratePerUnit: number;
    totalCost: number;
    supplierName: string;
    notes: string;
}

export interface EstimateLabour {
    id?: string;
    labourType: string;
    description: string;
    numberOfWorkers: number;
    workingDays: number;
    hoursPerDay: number;
    ratePerDay: number;
    overtimeHours: number;
    overtimeRate: number;
    baseCost: number;
    overtimeCost: number;
    totalCost: number;
}

export interface EstimateEquipment {
    id?: string;
    equipmentName: string;
    mode: string;
    numberOfUnits: number;
    durationDays: number;
    costPerDay: number;
    totalCost: number;
}

export interface EstimateTransport {
    id?: string;
    transportType: string;
    distance: number | null;
    numberOfTrips: number;
    costPerTrip: number;
    totalCost: number;
}

export interface ConstructionEstimate {
    id: string;
    projectName: string;
    projectType: string;
    status: string;
    currency: string;
    paymentTerms: string | null;
    startDate: string | null;
    endDate: string | null;
    address: string;
    formattedAddress: string | null;
    placeId: string | null;
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    satelliteImageUrl: string | null;
    totalMaterialCost: number;
    totalLabourCost: number;
    totalEquipmentCost: number;
    totalTransportCost: number;
    subtotal: number;
    taxPercent: number;
    taxAmount: number;
    overheadPercent: number;
    overheadCost: number;
    profitPercent: number;
    profitMargin: number;
    miscellaneousCost: number;
    safetyEquipmentCost: number;
    wastagePercent: number;
    contingencyBudget: number;
    grandTotal: number;
    clientNotes: string | null;
    internalNotes: string | null;
    termsAndConditions: string | null;
    measurements: EstimateMeasurement | null;
    materials: EstimateMaterial[];
    labour: EstimateLabour[];
    equipment: EstimateEquipment[];
    transport: EstimateTransport[];
    createdAt: string;
    updatedAt: string;
}

// ── API Functions ──

export async function createEstimate(body: any): Promise<ConstructionEstimate> {
    const res = await api.post('/construction-estimator', body);
    return res.data?.data;
}

export async function getEstimate(id: string): Promise<ConstructionEstimate> {
    const res = await api.get(`/construction-estimator/${id}`);
    return res.data?.data;
}

export async function listEstimates(params?: {
    page?: number; limit?: number; status?: string; search?: string;
}): Promise<{ data: ConstructionEstimate[]; total: number; page: number; totalPages: number }> {
    const res = await api.get('/construction-estimator', { params });
    return res.data;
}

export async function updateEstimate(id: string, body: any): Promise<ConstructionEstimate> {
    const res = await api.put(`/construction-estimator/${id}`, body);
    return res.data?.data;
}

export async function deleteEstimate(id: string): Promise<void> {
    await api.delete(`/construction-estimator/${id}`);
}

export async function recalculateEstimate(id: string): Promise<ConstructionEstimate> {
    const res = await api.post(`/construction-estimator/${id}/calculate`);
    return res.data?.data;
}

export async function saveEstimateMeasurements(id: string, body: any): Promise<ConstructionEstimate> {
    const res = await api.post(`/construction-estimator/${id}/measurements`, body);
    return res.data?.data;
}
