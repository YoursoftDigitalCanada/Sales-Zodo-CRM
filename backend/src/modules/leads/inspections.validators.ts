import { z } from 'zod';
import {
    CANADIAN_PHONE_VALIDATION_MESSAGE,
    CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE,
    EMAIL_VALIDATION_MESSAGE,
    isValidCanadianPhoneNumber,
    isValidCanadianPostalCode,
    isValidEmailAddress,
} from '@contracts/contact';

const inspectionFields = {
    // General
    inspectionDate: z.string().optional(),
    inspectorName: z.string().max(200).optional(),
    inspectionType: z.string().max(50).optional(),
    weatherConditions: z.string().max(100).optional(),
    accessMethod: z.string().max(50).optional(),
    overallCondition: z.string().max(50).optional(),

    // Roof Assessment
    roofStyle: z.string().max(50).optional(),
    roofPitch: z.string().max(50).optional(),
    totalSquares: z.number().min(0).optional(),
    ridgeLength: z.number().min(0).optional(),
    valleyLength: z.number().min(0).optional(),
    eaveLength: z.number().min(0).optional(),
    rakeLength: z.number().min(0).optional(),
    numberOfLayers: z.number().int().min(0).optional(),
    deckingType: z.string().max(50).optional(),
    deckingCondition: z.string().max(50).optional(),
    underlaymentType: z.string().max(50).optional(),
    ventilationType: z.string().max(100).optional(),
    ventilationCount: z.number().int().min(0).optional(),
    flashingCondition: z.string().max(50).optional(),
    gutterCondition: z.string().max(50).optional(),
    skylightCount: z.number().int().min(0).optional(),
    skylightCondition: z.string().max(100).optional(),
    chimneyPresent: z.boolean().optional(),
    chimneyCondition: z.string().max(100).optional(),
    soffitFasciaCondition: z.string().max(50).optional(),
    dripEdgePresent: z.boolean().optional(),
    dripEdgeCondition: z.string().max(50).optional(),
    iceWaterShieldPresent: z.boolean().optional(),

    // Damage Assessment
    stormDamageFound: z.boolean().optional(),
    windDamageDetails: z.string().max(2000).optional(),
    hailDamageDetails: z.string().max(2000).optional(),
    hailSizeFound: z.string().max(50).optional(),
    testSquareResults: z.string().max(2000).optional(),
    interiorDamageFound: z.boolean().optional(),
    interiorDamageDetails: z.string().max(2000).optional(),
    photosTakenCount: z.number().int().min(0).optional(),
    photoFileIds: z.array(z.string().uuid()).optional(),
    overallDamageRating: z.string().max(50).optional(),

    // Material Selections
    proposedMaterial: z.string().max(100).optional(),
    shingleBrand: z.string().max(100).optional(),
    shingleLine: z.string().max(100).optional(),
    shingleColor: z.string().max(100).optional(),
    underlaymentChoice: z.string().max(100).optional(),
    ridgeCapType: z.string().max(100).optional(),
    ventilationPlan: z.string().max(200).optional(),
    dripEdgeColor: z.string().max(50).optional(),
    warrantyType: z.string().max(50).optional(),
    warrantyYears: z.number().int().min(0).optional(),

    // Estimate & Pricing
    materialCost: z.number().min(0).optional(),
    laborCost: z.number().min(0).optional(),
    tearOffCost: z.number().min(0).optional(),
    permitCost: z.number().min(0).optional(),
    dumpsterCost: z.number().min(0).optional(),
    miscCost: z.number().min(0).optional(),
    subtotal: z.number().min(0).optional(),
    overheadPercent: z.number().min(0).max(100).optional(),
    profitPercent: z.number().min(0).max(100).optional(),
    totalEstimate: z.number().min(0).optional(),
    customerPrice: z.number().min(0).optional(),
    depositRequired: z.number().min(0).optional(),
    depositCollected: z.boolean().optional(),
    paymentMethod: z.string().max(50).optional(),
    estimateStatus: z.string().max(50).optional(),
    recommendation: z.string().max(50).optional(),

    // Scheduling & Logistics
    tentativeStartDate: z.string().optional(),
    estimatedDuration: z.string().max(50).optional(),
    crewSize: z.number().int().min(0).optional(),
    crewLeadName: z.string().max(200).optional(),
    materialsOrdered: z.boolean().optional(),
    materialsDeliveryDate: z.string().optional(),
    permitPulled: z.boolean().optional(),
    permitNumber: z.string().max(100).optional(),
    dumpsterOrdered: z.boolean().optional(),
    dumpsterDeliveryDate: z.string().optional(),

    // Notes
    inspectorNotes: z.string().max(5000).optional(),
    customerFeedback: z.string().max(5000).optional(),
    internalNotes: z.string().max(5000).optional(),
};

const manualClientSchema = z.object({
    clientName: z.string().trim().min(1).max(255),
    primaryEmail: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE),
    primaryPhone: z.string().trim().min(1).max(30).refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE),
    streetAddress: z.string().trim().min(1).max(255),
    city: z.string().trim().max(100).optional().nullable(),
    province: z.string().trim().max(100).optional().nullable(),
    postalCode: z.string().trim().max(20).refine(isValidCanadianPostalCode, CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE).optional().nullable(),
    companyName: z.string().trim().max(255).optional().nullable(),
    inspectionPurpose: z.string().trim().max(200).optional().nullable(),
    internalNotes: z.string().max(5000).optional().nullable(),
});

const createInspectionBodySchema = z
    .object({
        ...inspectionFields,
        leadId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        manualClient: manualClientSchema.optional(),
    })
    .superRefine((value, ctx) => {
        const sourceCount = [value.leadId, value.clientId, value.manualClient].filter(Boolean).length;

        if (sourceCount === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['leadId'],
                message: 'Select a lead, select a client, or enter a new inspection customer.',
            });
        }

        if (sourceCount > 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['leadId'],
                message: 'Inspection source must be either a lead, a client, or a new customer.',
            });
        }
    });

const updateInspectionBodySchema = z.object(inspectionFields);

export const createInspectionSchema = z.object({
    body: createInspectionBodySchema,
});

export const createInspectionForLeadSchema = z.object({
    body: z.object(inspectionFields),
    params: z.object({
        leadId: z.string().uuid(),
    }),
});

export const updateInspectionSchema = z.object({
    body: updateInspectionBodySchema,
    params: z.object({
        inspectionId: z.string().uuid(),
    }),
});

export const updateInspectionForLeadSchema = z.object({
    body: updateInspectionBodySchema,
    params: z.object({
        leadId: z.string().uuid(),
        inspectionId: z.string().uuid(),
    }),
});

export const inspectionIdSchema = z.object({
    params: z.object({
        inspectionId: z.string().uuid(),
    }),
});

export const inspectionIdForLeadSchema = z.object({
    params: z.object({
        leadId: z.string().uuid(),
        inspectionId: z.string().uuid(),
    }),
});

export const inspectionListSchema = z.object({
    query: z.object({
        leadId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
    }).superRefine((value, ctx) => {
        if (value.leadId && value.clientId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['clientId'],
                message: 'Use either leadId or clientId when filtering inspections.',
            });
        }
    }),
});

export const inspectionListForLeadSchema = z.object({
    params: z.object({
        leadId: z.string().uuid(),
    }),
});
