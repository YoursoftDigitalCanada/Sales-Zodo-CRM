import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

function stripNullishFields(data: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== null && value !== undefined),
    );
}

export interface InspectionLead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    propertyAddress: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    companyName: string | null;
    isInsuranceClaim: string | null;
    insuranceCompanyName: string | null;
    claimNumber: string | null;
}

export interface InspectionClient {
    id: string;
    clientName: string;
    companyName: string | null;
    primaryEmail: string | null;
    primaryPhone: string | null;
    streetAddress: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    insuranceCompanyName: string | null;
}

export interface ManualInspectionClientPayload {
    clientName: string;
    primaryEmail: string;
    primaryPhone: string;
    streetAddress: string;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    companyName?: string | null;
    inspectionPurpose?: string | null;
    internalNotes?: string | null;
}

export interface InspectionEntity {
    id: string;
    leadId: string | null;
    clientId: string | null;
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
    lead?: InspectionLead | null;
    client?: InspectionClient | null;
    [key: string]: unknown;
}

export async function getAllInspections(params?: { leadId?: string; clientId?: string }): Promise<InspectionEntity[]> {
    const response = await api.get("/inspections", { params });
    return extractApiArray<InspectionEntity>(response.data);
}

export async function getInspectionsByLeadId(leadId: string): Promise<InspectionEntity[]> {
    const response = await api.get("/inspections", { params: { leadId } });
    return extractApiArray<InspectionEntity>(response.data);
}

export async function getInspectionById(inspectionId: string): Promise<InspectionEntity>;
export async function getInspectionById(leadId: string, inspectionId: string): Promise<InspectionEntity>;
export async function getInspectionById(firstArg: string, secondArg?: string): Promise<InspectionEntity> {
    const response = secondArg
        ? await api.get(`/leads/${firstArg}/inspections/${secondArg}`)
        : await api.get(`/inspections/${firstArg}`);
    return response.data?.data || response.data;
}

export async function createInspection(data: Record<string, unknown>): Promise<InspectionEntity>;
export async function createInspection(leadId: string, data: Record<string, unknown>): Promise<InspectionEntity>;
export async function createInspection(firstArg: string | Record<string, unknown>, secondArg?: Record<string, unknown>): Promise<InspectionEntity> {
    const response = typeof firstArg === "string"
        ? await api.post(`/leads/${firstArg}/inspections`, stripNullishFields(secondArg || {}))
        : await api.post("/inspections", stripNullishFields(firstArg));
    return response.data?.data || response.data;
}

export async function updateInspection(inspectionId: string, data: Record<string, unknown>): Promise<InspectionEntity>;
export async function updateInspection(leadId: string, inspectionId: string, data: Record<string, unknown>): Promise<InspectionEntity>;
export async function updateInspection(
    firstArg: string,
    secondArg: string | Record<string, unknown>,
    thirdArg?: Record<string, unknown>,
): Promise<InspectionEntity> {
    const response = typeof secondArg === "string"
        ? await api.put(`/leads/${firstArg}/inspections/${secondArg}`, stripNullishFields(thirdArg || {}))
        : await api.put(`/inspections/${firstArg}`, stripNullishFields(secondArg));
    return response.data?.data || response.data;
}

export async function deleteInspection(inspectionId: string): Promise<void>;
export async function deleteInspection(leadId: string, inspectionId: string): Promise<void>;
export async function deleteInspection(firstArg: string, secondArg?: string): Promise<void> {
    if (secondArg) {
        await api.delete(`/leads/${firstArg}/inspections/${secondArg}`);
        return;
    }

    await api.delete(`/inspections/${firstArg}`);
}
