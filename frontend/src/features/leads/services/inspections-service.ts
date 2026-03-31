import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

function stripNullishFields(data: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== null && value !== undefined),
    );
}

export interface InspectionLead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    propertyAddress: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    companyName: string | null;
    isInsuranceClaim: string | null;
    insuranceCompanyName: string | null;
    claimNumber: string | null;
}

export interface InspectionEntity {
    id: string;
    leadId: string;
    tenantId: string;
    inspectionDate: string | null;
    inspectorName: string | null;
    inspectionType: string | null;
    weatherConditions: string | null;
    accessMethod: string | null;
    overallCondition: string | null;
    overallDamageRating: string | null;
    estimateStatus: string | null;
    totalSquares: number | null;
    roofPitch: string | null;
    ridgeLength: number | null;
    valleyLength: number | null;
    eaveLength: number | null;
    rakeLength: number | null;
    flashingCondition: string | null;
    gutterCondition: string | null;
    deckingCondition: string | null;
    ventilationType: string | null;
    ventilationCount: number | null;
    stormDamageFound: boolean | null;
    windDamageDetails: string | null;
    hailDamageDetails: string | null;
    hailSizeFound: string | null;
    inspectorNotes: string | null;
    photosTakenCount: number | null;
    photoFileIds: string[];
    totalEstimate: number | null;
    createdAt: string;
    updatedAt: string;
    lead?: InspectionLead;
    [key: string]: unknown;
}

export async function getAllInspections(): Promise<InspectionEntity[]> {
    const response = await api.get("/leads/inspections/all");
    return extractApiArray<InspectionEntity>(response.data);
}

export async function getInspectionsByLeadId(leadId: string): Promise<InspectionEntity[]> {
    const response = await api.get(`/leads/${leadId}/inspections`);
    return extractApiArray<InspectionEntity>(response.data);
}

export async function getInspectionById(leadId: string, inspectionId: string): Promise<InspectionEntity> {
    const response = await api.get(`/leads/${leadId}/inspections/${inspectionId}`);
    return response.data?.data || response.data;
}

export async function createInspection(leadId: string, data: Record<string, unknown>): Promise<InspectionEntity> {
    const response = await api.post(`/leads/${leadId}/inspections`, stripNullishFields(data));
    return response.data?.data || response.data;
}

export async function updateInspection(leadId: string, inspectionId: string, data: Record<string, unknown>): Promise<InspectionEntity> {
    const response = await api.put(`/leads/${leadId}/inspections/${inspectionId}`, stripNullishFields(data));
    return response.data?.data || response.data;
}

export async function deleteInspection(leadId: string, inspectionId: string): Promise<void> {
    await api.delete(`/leads/${leadId}/inspections/${inspectionId}`);
}
