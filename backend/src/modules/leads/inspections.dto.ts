import { Decimal } from '@prisma/client/runtime/library';

// ── Create DTO ────────────────────────────────────────────────────
export interface CreateLeadInspectionDto {
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
export type UpdateLeadInspectionDto = Partial<CreateLeadInspectionDto>;

// ── Response DTO ──────────────────────────────────────────────────
export interface LeadInspectionResponseDto {
    id: string;
    leadId: string;
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
}

// ── Mapper ────────────────────────────────────────────────────────

const decimalToNum = (v: Decimal | null | undefined): number | null =>
    v != null ? Number(v) : null;

const dateToStr = (v: Date | null | undefined): string | null =>
    v ? v.toISOString() : null;

export function toLeadInspectionResponseDto(i: any): LeadInspectionResponseDto {
    return {
        id: i.id,
        leadId: i.leadId,
        tenantId: i.tenantId,

        inspectionDate: dateToStr(i.inspectionDate),
        inspectorName: i.inspectorName ?? null,
        inspectionType: i.inspectionType ?? null,
        weatherConditions: i.weatherConditions ?? null,
        accessMethod: i.accessMethod ?? null,
        overallCondition: i.overallCondition ?? null,

        roofStyle: i.roofStyle ?? null,
        roofPitch: i.roofPitch ?? null,
        totalSquares: decimalToNum(i.totalSquares),
        ridgeLength: decimalToNum(i.ridgeLength),
        valleyLength: decimalToNum(i.valleyLength),
        eaveLength: decimalToNum(i.eaveLength),
        rakeLength: decimalToNum(i.rakeLength),
        numberOfLayers: i.numberOfLayers ?? null,
        deckingType: i.deckingType ?? null,
        deckingCondition: i.deckingCondition ?? null,
        underlaymentType: i.underlaymentType ?? null,
        ventilationType: i.ventilationType ?? null,
        ventilationCount: i.ventilationCount ?? null,
        flashingCondition: i.flashingCondition ?? null,
        gutterCondition: i.gutterCondition ?? null,
        skylightCount: i.skylightCount ?? null,
        skylightCondition: i.skylightCondition ?? null,
        chimneyPresent: i.chimneyPresent ?? null,
        chimneyCondition: i.chimneyCondition ?? null,
        soffitFasciaCondition: i.soffitFasciaCondition ?? null,
        dripEdgePresent: i.dripEdgePresent ?? null,
        dripEdgeCondition: i.dripEdgeCondition ?? null,
        iceWaterShieldPresent: i.iceWaterShieldPresent ?? null,

        stormDamageFound: i.stormDamageFound ?? null,
        windDamageDetails: i.windDamageDetails ?? null,
        hailDamageDetails: i.hailDamageDetails ?? null,
        hailSizeFound: i.hailSizeFound ?? null,
        testSquareResults: i.testSquareResults ?? null,
        interiorDamageFound: i.interiorDamageFound ?? null,
        interiorDamageDetails: i.interiorDamageDetails ?? null,
        photosTakenCount: i.photosTakenCount ?? null,
        overallDamageRating: i.overallDamageRating ?? null,

        proposedMaterial: i.proposedMaterial ?? null,
        shingleBrand: i.shingleBrand ?? null,
        shingleLine: i.shingleLine ?? null,
        shingleColor: i.shingleColor ?? null,
        underlaymentChoice: i.underlaymentChoice ?? null,
        ridgeCapType: i.ridgeCapType ?? null,
        ventilationPlan: i.ventilationPlan ?? null,
        dripEdgeColor: i.dripEdgeColor ?? null,
        warrantyType: i.warrantyType ?? null,
        warrantyYears: i.warrantyYears ?? null,

        materialCost: decimalToNum(i.materialCost),
        laborCost: decimalToNum(i.laborCost),
        tearOffCost: decimalToNum(i.tearOffCost),
        permitCost: decimalToNum(i.permitCost),
        dumpsterCost: decimalToNum(i.dumpsterCost),
        miscCost: decimalToNum(i.miscCost),
        subtotal: decimalToNum(i.subtotal),
        overheadPercent: decimalToNum(i.overheadPercent),
        profitPercent: decimalToNum(i.profitPercent),
        totalEstimate: decimalToNum(i.totalEstimate),
        customerPrice: decimalToNum(i.customerPrice),
        depositRequired: decimalToNum(i.depositRequired),
        depositCollected: i.depositCollected ?? null,
        paymentMethod: i.paymentMethod ?? null,
        estimateStatus: i.estimateStatus ?? null,

        tentativeStartDate: dateToStr(i.tentativeStartDate),
        estimatedDuration: i.estimatedDuration ?? null,
        crewSize: i.crewSize ?? null,
        crewLeadName: i.crewLeadName ?? null,
        materialsOrdered: i.materialsOrdered ?? null,
        materialsDeliveryDate: dateToStr(i.materialsDeliveryDate),
        permitPulled: i.permitPulled ?? null,
        permitNumber: i.permitNumber ?? null,
        dumpsterOrdered: i.dumpsterOrdered ?? null,
        dumpsterDeliveryDate: dateToStr(i.dumpsterDeliveryDate),

        inspectorNotes: i.inspectorNotes ?? null,
        customerFeedback: i.customerFeedback ?? null,
        internalNotes: i.internalNotes ?? null,

        createdById: i.createdById ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    };
}
