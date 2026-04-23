import { Decimal } from '@prisma/client/runtime/library';

export interface ManualInspectionClientDto {
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

// ── Create DTO ────────────────────────────────────────────────────
export interface CreateLeadInspectionDto {
    leadId?: string;
    clientId?: string;
    manualClient?: ManualInspectionClientDto;

    // General
    inspectionDate?: string | Date;
    inspectorName?: string;
    inspectionType?: string;
    weatherConditions?: string;
    accessMethod?: string;
    overallCondition?: string;

    // Roof Assessment
    roofStyle?: string;
    roofPitch?: string;
    totalSquares?: number;
    ridgeLength?: number;
    valleyLength?: number;
    eaveLength?: number;
    rakeLength?: number;
    numberOfLayers?: number;
    deckingType?: string;
    deckingCondition?: string;
    underlaymentType?: string;
    ventilationType?: string;
    ventilationCount?: number;
    flashingCondition?: string;
    gutterCondition?: string;
    skylightCount?: number;
    skylightCondition?: string;
    chimneyPresent?: boolean;
    chimneyCondition?: string;
    soffitFasciaCondition?: string;
    dripEdgePresent?: boolean;
    dripEdgeCondition?: string;
    iceWaterShieldPresent?: boolean;

    // Damage Assessment
    stormDamageFound?: boolean;
    windDamageDetails?: string;
    hailDamageDetails?: string;
    hailSizeFound?: string;
    testSquareResults?: string;
    interiorDamageFound?: boolean;
    interiorDamageDetails?: string;
    photosTakenCount?: number;
    photoFileIds?: string[];
    overallDamageRating?: string;

    // Material Selections
    proposedMaterial?: string;
    shingleBrand?: string;
    shingleLine?: string;
    shingleColor?: string;
    underlaymentChoice?: string;
    ridgeCapType?: string;
    ventilationPlan?: string;
    dripEdgeColor?: string;
    warrantyType?: string;
    warrantyYears?: number;

    // Estimate & Pricing
    materialCost?: number;
    laborCost?: number;
    tearOffCost?: number;
    permitCost?: number;
    dumpsterCost?: number;
    miscCost?: number;
    subtotal?: number;
    overheadPercent?: number;
    profitPercent?: number;
    totalEstimate?: number;
    customerPrice?: number;
    depositRequired?: number;
    depositCollected?: boolean;
    paymentMethod?: string;
    estimateStatus?: string;

    // Scheduling & Logistics
    tentativeStartDate?: string | Date;
    estimatedDuration?: string;
    crewSize?: number;
    crewLeadName?: string;
    materialsOrdered?: boolean;
    materialsDeliveryDate?: string | Date;
    permitPulled?: boolean;
    permitNumber?: string;
    dumpsterOrdered?: boolean;
    dumpsterDeliveryDate?: string | Date;

    // Notes
    inspectorNotes?: string;
    customerFeedback?: string;
    internalNotes?: string;
}

// ── Update DTO ────────────────────────────────────────────────────
export type UpdateLeadInspectionDto = Partial<Omit<CreateLeadInspectionDto, 'leadId' | 'clientId' | 'manualClient'>>;

export interface InspectionLeadResponseDto {
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

export interface InspectionClientResponseDto {
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

// ── Response DTO ──────────────────────────────────────────────────
export interface LeadInspectionResponseDto {
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

    roofStyle: string | null;
    roofPitch: string | null;
    totalSquares: number | null;
    ridgeLength: number | null;
    valleyLength: number | null;
    eaveLength: number | null;
    rakeLength: number | null;
    numberOfLayers: number | null;
    deckingType: string | null;
    deckingCondition: string | null;
    underlaymentType: string | null;
    ventilationType: string | null;
    ventilationCount: number | null;
    flashingCondition: string | null;
    gutterCondition: string | null;
    skylightCount: number | null;
    skylightCondition: string | null;
    chimneyPresent: boolean | null;
    chimneyCondition: string | null;
    soffitFasciaCondition: string | null;
    dripEdgePresent: boolean | null;
    dripEdgeCondition: string | null;
    iceWaterShieldPresent: boolean | null;

    stormDamageFound: boolean | null;
    windDamageDetails: string | null;
    hailDamageDetails: string | null;
    hailSizeFound: string | null;
    testSquareResults: string | null;
    interiorDamageFound: boolean | null;
    interiorDamageDetails: string | null;
    photosTakenCount: number | null;
    photoFileIds: string[];
    overallDamageRating: string | null;

    proposedMaterial: string | null;
    shingleBrand: string | null;
    shingleLine: string | null;
    shingleColor: string | null;
    underlaymentChoice: string | null;
    ridgeCapType: string | null;
    ventilationPlan: string | null;
    dripEdgeColor: string | null;
    warrantyType: string | null;
    warrantyYears: number | null;

    materialCost: number | null;
    laborCost: number | null;
    tearOffCost: number | null;
    permitCost: number | null;
    dumpsterCost: number | null;
    miscCost: number | null;
    subtotal: number | null;
    overheadPercent: number | null;
    profitPercent: number | null;
    totalEstimate: number | null;
    customerPrice: number | null;
    depositRequired: number | null;
    depositCollected: boolean | null;
    paymentMethod: string | null;
    estimateStatus: string | null;

    tentativeStartDate: string | null;
    estimatedDuration: string | null;
    crewSize: number | null;
    crewLeadName: string | null;
    materialsOrdered: boolean | null;
    materialsDeliveryDate: string | null;
    permitPulled: boolean | null;
    permitNumber: string | null;
    dumpsterOrdered: boolean | null;
    dumpsterDeliveryDate: string | null;

    inspectorNotes: string | null;
    customerFeedback: string | null;
    internalNotes: string | null;

    createdById: string | null;
    createdAt: string;
    updatedAt: string;
    lead?: InspectionLeadResponseDto | null;
    client?: InspectionClientResponseDto | null;
}

const decimalToNum = (value: Decimal | null | undefined): number | null =>
    value != null ? Number(value) : null;

const dateToStr = (value: Date | null | undefined): string | null =>
    value ? value.toISOString() : null;

function toInspectionLeadResponseDto(lead: any): InspectionLeadResponseDto {
    return {
        id: lead.id,
        firstName: lead.firstName ?? null,
        lastName: lead.lastName ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        propertyAddress: lead.propertyAddress ?? null,
        city: lead.city ?? null,
        state: lead.state ?? null,
        zipCode: lead.zipCode ?? null,
        companyName: lead.companyName ?? null,
        isInsuranceClaim: lead.isInsuranceClaim ?? null,
        insuranceCompanyName: lead.insuranceCompanyName ?? null,
        claimNumber: lead.claimNumber ?? null,
    };
}

function toInspectionClientResponseDto(client: any): InspectionClientResponseDto {
    return {
        id: client.id,
        clientName: client.clientName,
        companyName: client.companyName ?? null,
        primaryEmail: client.primaryEmail ?? null,
        primaryPhone: client.primaryPhone ?? null,
        streetAddress: client.streetAddress ?? null,
        city: client.city ?? null,
        province: client.province ?? null,
        postalCode: client.postalCode ?? null,
        insuranceCompanyName: client.insuranceCompanyName ?? null,
    };
}

export function toLeadInspectionResponseDto(inspection: any): LeadInspectionResponseDto {
    return {
        id: inspection.id,
        leadId: inspection.leadId ?? null,
        clientId: inspection.clientId ?? null,
        tenantId: inspection.tenantId,

        inspectionDate: dateToStr(inspection.inspectionDate),
        inspectorName: inspection.inspectorName ?? null,
        inspectionType: inspection.inspectionType ?? null,
        weatherConditions: inspection.weatherConditions ?? null,
        accessMethod: inspection.accessMethod ?? null,
        overallCondition: inspection.overallCondition ?? null,

        roofStyle: inspection.roofStyle ?? null,
        roofPitch: inspection.roofPitch ?? null,
        totalSquares: decimalToNum(inspection.totalSquares),
        ridgeLength: decimalToNum(inspection.ridgeLength),
        valleyLength: decimalToNum(inspection.valleyLength),
        eaveLength: decimalToNum(inspection.eaveLength),
        rakeLength: decimalToNum(inspection.rakeLength),
        numberOfLayers: inspection.numberOfLayers ?? null,
        deckingType: inspection.deckingType ?? null,
        deckingCondition: inspection.deckingCondition ?? null,
        underlaymentType: inspection.underlaymentType ?? null,
        ventilationType: inspection.ventilationType ?? null,
        ventilationCount: inspection.ventilationCount ?? null,
        flashingCondition: inspection.flashingCondition ?? null,
        gutterCondition: inspection.gutterCondition ?? null,
        skylightCount: inspection.skylightCount ?? null,
        skylightCondition: inspection.skylightCondition ?? null,
        chimneyPresent: inspection.chimneyPresent ?? null,
        chimneyCondition: inspection.chimneyCondition ?? null,
        soffitFasciaCondition: inspection.soffitFasciaCondition ?? null,
        dripEdgePresent: inspection.dripEdgePresent ?? null,
        dripEdgeCondition: inspection.dripEdgeCondition ?? null,
        iceWaterShieldPresent: inspection.iceWaterShieldPresent ?? null,

        stormDamageFound: inspection.stormDamageFound ?? null,
        windDamageDetails: inspection.windDamageDetails ?? null,
        hailDamageDetails: inspection.hailDamageDetails ?? null,
        hailSizeFound: inspection.hailSizeFound ?? null,
        testSquareResults: inspection.testSquareResults ?? null,
        interiorDamageFound: inspection.interiorDamageFound ?? null,
        interiorDamageDetails: inspection.interiorDamageDetails ?? null,
        photosTakenCount: inspection.photosTakenCount ?? null,
        photoFileIds: Array.isArray(inspection.photoFileIds) ? inspection.photoFileIds : [],
        overallDamageRating: inspection.overallDamageRating ?? null,

        proposedMaterial: inspection.proposedMaterial ?? null,
        shingleBrand: inspection.shingleBrand ?? null,
        shingleLine: inspection.shingleLine ?? null,
        shingleColor: inspection.shingleColor ?? null,
        underlaymentChoice: inspection.underlaymentChoice ?? null,
        ridgeCapType: inspection.ridgeCapType ?? null,
        ventilationPlan: inspection.ventilationPlan ?? null,
        dripEdgeColor: inspection.dripEdgeColor ?? null,
        warrantyType: inspection.warrantyType ?? null,
        warrantyYears: inspection.warrantyYears ?? null,

        materialCost: decimalToNum(inspection.materialCost),
        laborCost: decimalToNum(inspection.laborCost),
        tearOffCost: decimalToNum(inspection.tearOffCost),
        permitCost: decimalToNum(inspection.permitCost),
        dumpsterCost: decimalToNum(inspection.dumpsterCost),
        miscCost: decimalToNum(inspection.miscCost),
        subtotal: decimalToNum(inspection.subtotal),
        overheadPercent: decimalToNum(inspection.overheadPercent),
        profitPercent: decimalToNum(inspection.profitPercent),
        totalEstimate: decimalToNum(inspection.totalEstimate),
        customerPrice: decimalToNum(inspection.customerPrice),
        depositRequired: decimalToNum(inspection.depositRequired),
        depositCollected: inspection.depositCollected ?? null,
        paymentMethod: inspection.paymentMethod ?? null,
        estimateStatus: inspection.estimateStatus ?? null,

        tentativeStartDate: dateToStr(inspection.tentativeStartDate),
        estimatedDuration: inspection.estimatedDuration ?? null,
        crewSize: inspection.crewSize ?? null,
        crewLeadName: inspection.crewLeadName ?? null,
        materialsOrdered: inspection.materialsOrdered ?? null,
        materialsDeliveryDate: dateToStr(inspection.materialsDeliveryDate),
        permitPulled: inspection.permitPulled ?? null,
        permitNumber: inspection.permitNumber ?? null,
        dumpsterOrdered: inspection.dumpsterOrdered ?? null,
        dumpsterDeliveryDate: dateToStr(inspection.dumpsterDeliveryDate),

        inspectorNotes: inspection.inspectorNotes ?? null,
        customerFeedback: inspection.customerFeedback ?? null,
        internalNotes: inspection.internalNotes ?? null,

        createdById: inspection.createdById ?? null,
        createdAt: dateToStr(inspection.createdAt) ?? new Date().toISOString(),
        updatedAt: dateToStr(inspection.updatedAt) ?? new Date().toISOString(),
        lead: inspection.lead ? toInspectionLeadResponseDto(inspection.lead) : null,
        client: inspection.client ? toInspectionClientResponseDto(inspection.client) : null,
    };
}
