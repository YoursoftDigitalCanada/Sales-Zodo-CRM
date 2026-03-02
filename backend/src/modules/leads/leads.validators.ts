import { z } from 'zod';

// ============================================================================
// LEADS - Add New Lead
// ============================================================================

export const createLeadSchema = z.object({
  body: z.object({
    // Basic Info
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    location: z.string().max(255).optional().nullable(),

    // Company Info
    companyName: z.string().max(255).default(''),
    jobTitle: z.string().max(100).optional().nullable(),
    website: z.string().url().optional().nullable().or(z.literal('')),

    // Lead Details
    leadSourceId: z.string().uuid().optional().nullable(),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
    temperature: z.enum(['COLD', 'WARM', 'HOT']).default('COLD'),
    potentialValue: z.number().min(0).optional().nullable(),
    assignedToId: z.string().uuid().optional().nullable(),
    tagIds: z.array(z.string().uuid()).default([]),
    notes: z.string().optional().nullable(),

    // ── Stage 1: Property Info ─────────────────────────────────────────
    propertyAddress: z.string().max(500).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(50).optional().nullable(),
    zipCode: z.string().max(10).optional().nullable(),
    propertyType: z.enum(['Residential', 'Commercial', 'Multi-Family']).optional().nullable(),

    // ── Stage 1: Service Request ───────────────────────────────────────
    serviceType: z.string().max(100).optional().nullable(),
    isInsuranceClaim: z.enum(['Yes', 'No', 'Not Sure']).optional().nullable(),
    urgencyLevel: z.string().max(100).optional().nullable(),
    preferredContactMethod: z.enum(['Phone Call', 'Text', 'Email']).optional().nullable(),
    bestTimeToContact: z.string().max(100).optional().nullable(),
    issueDescription: z.string().max(2000).optional().nullable(),

    // ── Stage 1: UTM / Auto-captured ───────────────────────────────────
    leadSourceUTM: z.string().max(255).optional().nullable(),
    leadCampaignUTM: z.string().max(255).optional().nullable(),
    leadMediumUTM: z.string().max(255).optional().nullable(),
    landingPageURL: z.string().max(500).optional().nullable(),
    ipAddress: z.string().max(45).optional().nullable(),
    deviceType: z.string().max(50).optional().nullable(),
    browserType: z.string().max(100).optional().nullable(),

    // ── Stage 2: Verification ──────────────────────────────────────────
    confirmedName: z.boolean().optional(),
    confirmedPhone: z.boolean().optional(),
    confirmedEmail: z.boolean().optional(),
    confirmedAddress: z.boolean().optional(),
    secondaryPhone: z.string().max(30).optional().nullable(),
    spouseCoOwnerName: z.string().max(100).optional().nullable(),

    // ── Stage 2: Ownership ─────────────────────────────────────────────
    isHomeowner: z.enum(['Yes', 'No', 'Tenant']).optional().nullable(),
    isDecisionMaker: z.enum(['Yes', 'No', 'Need Spouse Approval']).optional().nullable(),
    ownershipType: z.enum(['Owner-Occupied', 'Rental Property', 'Investment Property']).optional().nullable(),

    // ── Stage 2: Roof Details ──────────────────────────────────────────
    roofAge: z.string().max(50).optional().nullable(),
    currentRoofMaterial: z.string().max(100).optional().nullable(),
    numberOfStories: z.enum(['1', '2', '3+']).optional().nullable(),
    knownDamageType: z.array(z.string()).optional().nullable(),
    damageOccurrenceDate: z.string().max(100).optional().nullable(),
    previousRoofWork: z.enum(['Yes', 'No', 'Unknown']).optional().nullable(),
    previousRoofWorkDetails: z.string().max(200).optional().nullable(),

    // ── Stage 2: Insurance ─────────────────────────────────────────────
    insuranceCompanyName: z.string().max(200).optional().nullable(),
    hasClaimBeenFiled: z.enum(['Yes', 'No', 'Planning To']).optional().nullable(),
    claimNumber: z.string().max(100).optional().nullable(),
    adjusterAssigned: z.enum(['Yes', 'No', 'Not Yet']).optional().nullable(),
    adjusterName: z.string().max(100).optional().nullable(),
    adjusterPhone: z.string().max(30).optional().nullable(),
    adjusterEmail: z.string().email().optional().nullable().or(z.literal('')),
    adjusterMeetingDate: z.string().datetime().optional().nullable().or(z.literal('')),

    // ── Stage 2: Budget & Timeline ─────────────────────────────────────
    budgetRange: z.string().max(100).optional().nullable(),
    workTimeline: z.string().max(100).optional().nullable(),
    financingNeeded: z.enum(['Yes', 'No', 'Maybe']).optional().nullable(),
    gettingOtherQuotes: z.enum(['Yes', 'No']).optional().nullable(),
    numberOfOtherQuotes: z.number().int().min(0).max(10).optional().nullable(),
    topPriority: z.string().max(100).optional().nullable(),

    // ── Stage 2: HOA ───────────────────────────────────────────────────
    isHOA: z.enum(['Yes', 'No', 'Not Sure']).optional().nullable(),
    hoaRestrictions: z.string().max(500).optional().nullable(),

    // ── Stage 2: Sales Assessment ──────────────────────────────────────
    leadScore: z.number().int().min(1).max(10).optional().nullable(),
    disqualifiedReason: z.string().max(200).optional().nullable(),
    nextStep: z.string().max(200).optional().nullable(),
    followUpDateTime: z.string().datetime().optional().nullable().or(z.literal('')),
    inspectionAppointmentDate: z.string().datetime().optional().nullable().or(z.literal('')),
    qualificationCallNotes: z.string().max(2000).optional().nullable(),
  }),
});

export const updateLeadSchema = z.object({
  body: z.object({
    // Basic Info
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional().nullable(),
    location: z.string().max(255).optional().nullable(),

    // Company Info
    companyName: z.string().max(255).optional(),
    jobTitle: z.string().max(100).optional().nullable(),
    website: z.string().url().optional().nullable().or(z.literal('')),

    // Lead Details
    leadSourceId: z.string().uuid().optional().nullable(),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
    temperature: z.enum(['COLD', 'WARM', 'HOT']).optional(),
    potentialValue: z.number().min(0).optional().nullable(),
    assignedToId: z.string().uuid().optional().nullable(),
    tagIds: z.array(z.string().uuid()).optional(),
    notes: z.string().optional().nullable(),

    // ── Stage 1: Property Info ─────────────────────────────────────────
    propertyAddress: z.string().max(500).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(50).optional().nullable(),
    zipCode: z.string().max(10).optional().nullable(),
    propertyType: z.enum(['Residential', 'Commercial', 'Multi-Family']).optional().nullable(),

    // ── Stage 1: Service Request ───────────────────────────────────────
    serviceType: z.string().max(100).optional().nullable(),
    isInsuranceClaim: z.enum(['Yes', 'No', 'Not Sure']).optional().nullable(),
    urgencyLevel: z.string().max(100).optional().nullable(),
    preferredContactMethod: z.enum(['Phone Call', 'Text', 'Email']).optional().nullable(),
    bestTimeToContact: z.string().max(100).optional().nullable(),
    issueDescription: z.string().max(2000).optional().nullable(),

    // ── Stage 1: UTM / Auto-captured ───────────────────────────────────
    leadSourceUTM: z.string().max(255).optional().nullable(),
    leadCampaignUTM: z.string().max(255).optional().nullable(),
    leadMediumUTM: z.string().max(255).optional().nullable(),
    landingPageURL: z.string().max(500).optional().nullable(),
    ipAddress: z.string().max(45).optional().nullable(),
    deviceType: z.string().max(50).optional().nullable(),
    browserType: z.string().max(100).optional().nullable(),

    // ── Stage 2: Verification ──────────────────────────────────────────
    confirmedName: z.boolean().optional(),
    confirmedPhone: z.boolean().optional(),
    confirmedEmail: z.boolean().optional(),
    confirmedAddress: z.boolean().optional(),
    secondaryPhone: z.string().max(30).optional().nullable(),
    spouseCoOwnerName: z.string().max(100).optional().nullable(),

    // ── Stage 2: Ownership ─────────────────────────────────────────────
    isHomeowner: z.enum(['Yes', 'No', 'Tenant']).optional().nullable(),
    isDecisionMaker: z.enum(['Yes', 'No', 'Need Spouse Approval']).optional().nullable(),
    ownershipType: z.enum(['Owner-Occupied', 'Rental Property', 'Investment Property']).optional().nullable(),

    // ── Stage 2: Roof Details ──────────────────────────────────────────
    roofAge: z.string().max(50).optional().nullable(),
    currentRoofMaterial: z.string().max(100).optional().nullable(),
    numberOfStories: z.enum(['1', '2', '3+']).optional().nullable(),
    knownDamageType: z.array(z.string()).optional().nullable(),
    damageOccurrenceDate: z.string().max(100).optional().nullable(),
    previousRoofWork: z.enum(['Yes', 'No', 'Unknown']).optional().nullable(),
    previousRoofWorkDetails: z.string().max(200).optional().nullable(),

    // ── Stage 2: Insurance ─────────────────────────────────────────────
    insuranceCompanyName: z.string().max(200).optional().nullable(),
    hasClaimBeenFiled: z.enum(['Yes', 'No', 'Planning To']).optional().nullable(),
    claimNumber: z.string().max(100).optional().nullable(),
    adjusterAssigned: z.enum(['Yes', 'No', 'Not Yet']).optional().nullable(),
    adjusterName: z.string().max(100).optional().nullable(),
    adjusterPhone: z.string().max(30).optional().nullable(),
    adjusterEmail: z.string().email().optional().nullable().or(z.literal('')),
    adjusterMeetingDate: z.string().datetime().optional().nullable().or(z.literal('')),

    // ── Stage 2: Budget & Timeline ─────────────────────────────────────
    budgetRange: z.string().max(100).optional().nullable(),
    workTimeline: z.string().max(100).optional().nullable(),
    financingNeeded: z.enum(['Yes', 'No', 'Maybe']).optional().nullable(),
    gettingOtherQuotes: z.enum(['Yes', 'No']).optional().nullable(),
    numberOfOtherQuotes: z.number().int().min(0).max(10).optional().nullable(),
    topPriority: z.string().max(100).optional().nullable(),

    // ── Stage 2: HOA ───────────────────────────────────────────────────
    isHOA: z.enum(['Yes', 'No', 'Not Sure']).optional().nullable(),
    hoaRestrictions: z.string().max(500).optional().nullable(),

    // ── Stage 2: Sales Assessment ──────────────────────────────────────
    leadScore: z.number().int().min(1).max(10).optional().nullable(),
    disqualifiedReason: z.string().max(200).optional().nullable(),
    nextStep: z.string().max(200).optional().nullable(),
    followUpDateTime: z.string().datetime().optional().nullable().or(z.literal('')),
    inspectionAppointmentDate: z.string().datetime().optional().nullable().or(z.literal('')),
    qualificationCallNotes: z.string().max(2000).optional().nullable(),
  }),
});

export const leadQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
    temperature: z.enum(['COLD', 'WARM', 'HOT']).optional(),
    assignedTo: z.string().uuid().optional(),
    leadSource: z.string().optional(),
    sortBy: z.enum(['firstName', 'createdAt', 'potentialValue', 'companyName']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const leadIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const convertLeadSchema = z.object({
  body: z.object({
    createClient: z.boolean().default(true),
    clientType: z.enum(['BUSINESS', 'INDIVIDUAL']).default('BUSINESS'),
    createContact: z.boolean().default(false),
  }),
});

export const bulkAssignSchema = z.object({
  body: z.object({
    leadIds: z.array(z.string().uuid()).min(1),
    assignedToId: z.string().uuid(),
  }),
});

export const bulkStatusSchema = z.object({
  body: z.object({
    leadIds: z.array(z.string().uuid()).min(1),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']),
  }),
});

export const pipelineQuerySchema = z.object({
  query: z.object({
    assignedTo: z.string().uuid().optional(),
    temperature: z.enum(['COLD', 'WARM', 'HOT']).optional(),
    leadSource: z.string().optional(),
  }),
});