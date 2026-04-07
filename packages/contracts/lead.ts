import { z } from "zod";
import {
  LeadStatusSchema,
  LeadTemperatureSchema,
  SortOrderSchema,
  PipelineEntityTypeSchema,
} from "./enums";
import {
  CANADIAN_PHONE_VALIDATION_MESSAGE,
  CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE,
  EMAIL_VALIDATION_MESSAGE,
  PERSON_NAME_VALIDATION_MESSAGE,
  isValidCanadianPhoneNumber,
  isValidCanadianPostalCode,
  isValidEmailAddress,
  isValidPersonName,
} from "./contact";

const nullableDateTime = z.string().datetime().optional().nullable().or(z.literal(""));

export const CreateLeadSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(isValidPersonName, `First name ${PERSON_NAME_VALIDATION_MESSAGE}`),
  lastName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(isValidPersonName, `Last name ${PERSON_NAME_VALIDATION_MESSAGE}`),
  email: z
    .string()
    .trim()
    .refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE)
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE)
    .optional()
    .nullable(),
  location: z.string().max(255).optional().nullable(),
  companyName: z.string().max(255).default(""),
  jobTitle: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  leadSourceId: z.string().uuid().optional().nullable(),
  status: LeadStatusSchema.default("NEW"),
  temperature: LeadTemperatureSchema.default("COLD"),
  potentialValue: z.number().min(0).optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).default([]),
  notes: z.string().optional().nullable(),
  propertyAddress: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zipCode: z
    .string()
    .trim()
    .max(10)
    .refine(isValidCanadianPostalCode, CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE)
    .optional()
    .nullable(),
  propertyType: z.enum(["Residential", "Commercial", "Multi-Family"]).optional().nullable(),
  serviceType: z.string().max(100).optional().nullable(),
  isInsuranceClaim: z.enum(["Yes", "No", "Not Sure"]).optional().nullable(),
  urgencyLevel: z.string().max(100).optional().nullable(),
  preferredContactMethod: z.enum(["Phone Call", "Text", "Email"]).optional().nullable(),
  bestTimeToContact: z.string().max(100).optional().nullable(),
  issueDescription: z.string().max(2000).optional().nullable(),
  leadSourceUTM: z.string().max(255).optional().nullable(),
  leadCampaignUTM: z.string().max(255).optional().nullable(),
  leadMediumUTM: z.string().max(255).optional().nullable(),
  landingPageURL: z.string().max(500).optional().nullable(),
  ipAddress: z.string().max(45).optional().nullable(),
  deviceType: z.string().max(50).optional().nullable(),
  browserType: z.string().max(100).optional().nullable(),
  confirmedName: z.boolean().optional(),
  confirmedPhone: z.boolean().optional(),
  confirmedEmail: z.boolean().optional(),
  confirmedAddress: z.boolean().optional(),
  secondaryPhone: z
    .string()
    .trim()
    .max(30)
    .refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE)
    .optional()
    .nullable(),
  spouseCoOwnerName: z
    .string()
    .trim()
    .max(100)
    .refine(isValidPersonName, `Spouse / co-owner name ${PERSON_NAME_VALIDATION_MESSAGE}`)
    .optional()
    .nullable(),
  isHomeowner: z.enum(["Yes", "No", "Tenant"]).optional().nullable(),
  isDecisionMaker: z.enum(["Yes", "No", "Need Spouse Approval"]).optional().nullable(),
  ownershipType: z.enum(["Owner-Occupied", "Rental Property", "Investment Property"]).optional().nullable(),
  roofAge: z.string().max(50).optional().nullable(),
  currentRoofMaterial: z.string().max(100).optional().nullable(),
  numberOfStories: z.enum(["1", "2", "3+"]).optional().nullable(),
  knownDamageType: z.array(z.string()).optional().nullable(),
  damageOccurrenceDate: z.string().max(100).optional().nullable(),
  previousRoofWork: z.enum(["Yes", "No", "Unknown"]).optional().nullable(),
  previousRoofWorkDetails: z.string().max(200).optional().nullable(),
  insuranceCompanyName: z.string().max(200).optional().nullable(),
  hasClaimBeenFiled: z.enum(["Yes", "No", "Planning To"]).optional().nullable(),
  claimNumber: z.string().max(100).optional().nullable(),
  adjusterAssigned: z.enum(["Yes", "No", "Not Yet"]).optional().nullable(),
  adjusterName: z
    .string()
    .trim()
    .max(100)
    .refine(isValidPersonName, `Adjuster name ${PERSON_NAME_VALIDATION_MESSAGE}`)
    .optional()
    .nullable(),
  adjusterPhone: z
    .string()
    .trim()
    .max(30)
    .refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE)
    .optional()
    .nullable(),
  adjusterEmail: z
    .string()
    .trim()
    .refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE)
    .optional()
    .nullable()
    .or(z.literal("")),
  adjusterMeetingDate: nullableDateTime,
  budgetRange: z.string().max(100).optional().nullable(),
  workTimeline: z.string().max(100).optional().nullable(),
  financingNeeded: z.enum(["Yes", "No", "Maybe"]).optional().nullable(),
  gettingOtherQuotes: z.enum(["Yes", "No"]).optional().nullable(),
  numberOfOtherQuotes: z.number().int().min(0).max(10).optional().nullable(),
  topPriority: z.string().max(100).optional().nullable(),
  isHOA: z.enum(["Yes", "No", "Not Sure"]).optional().nullable(),
  hoaRestrictions: z.string().max(500).optional().nullable(),
  leadScore: z.number().int().min(1).max(10).optional().nullable(),
  disqualifiedReason: z.string().max(200).optional().nullable(),
  nextStep: z.string().max(200).optional().nullable(),
  followUpDateTime: nullableDateTime,
  inspectionAppointmentDate: nullableDateTime,
  qualificationCallNotes: z.string().max(2000).optional().nullable(),

  // ── Closure / Inactive State Fields ───────────────────────────────────
  closureReason: z.string().max(1000).optional().nullable(),
  duplicateOfLeadId: z.string().uuid().optional().nullable(),
  closedAt: z.string().datetime().optional().nullable(),
  reactivateAt: z.string().datetime().optional().nullable(),
});

export const UpdateLeadSchema = CreateLeadSchema.partial();

export const LeadQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().optional(),
  status: LeadStatusSchema.optional(),
  temperature: LeadTemperatureSchema.optional(),
  assignedToId: z.string().uuid().optional(),
  leadSourceId: z.string().uuid().optional(),
  convertedToClientId: z.string().uuid().optional(),
  sortBy: z.enum(["firstName", "createdAt", "potentialValue", "companyName"]).default("createdAt"),
  sortOrder: SortOrderSchema.default("desc"),
});

export const LeadPipelineQuerySchema = z.object({
  assignedToId: z.string().uuid().optional(),
  leadSourceId: z.string().uuid().optional(),
  temperature: LeadTemperatureSchema.optional(),
});

export const LeadIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ConvertLeadSchema = z.object({
  createClient: z.boolean().default(true),
  clientType: z.enum(["BUSINESS", "INDIVIDUAL", "COMPANY"]).default("BUSINESS"),
  createContact: z.boolean().default(false),
});

export const BulkAssignLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  assignedToId: z.string().uuid(),
});

export const BulkUpdateLeadStatusSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  status: LeadStatusSchema,
});

export const MarkLeadContactedSchema = z
  .object({
    propertyType: z.string().min(1),
    numberOfStories: z.string().min(1),
    approxRoofAge: z.string().min(1),
    currentRoofMaterial: z.string().optional().nullable(),
    mainIssue: z.array(z.string().min(1)).min(1),
    urgencyLevel: z.string().min(1),
    issueStartTimeline: z.string().min(1),
    isInsuranceClaim: z.boolean(),
    insuranceCompany: z.string().optional().nullable(),
    claimFiled: z.string().optional().nullable(),
    dateOfDamage: z.coerce.date().optional().nullable(),
    claimNumber: z.string().optional().nullable(),
    decisionMaker: z.string().min(1),
    decisionTimeline: z.string().min(1),
    gettingOtherQuotes: z.boolean().optional().nullable(),
    contactNotes: z.string().min(1),
    leadTemperature: z.string().min(1),
    estimatedDealValue: z.number().finite(),
  })
  .superRefine((
    data: {
      isInsuranceClaim: boolean;
      insuranceCompany?: string | null;
      claimFiled?: string | null;
      dateOfDamage?: Date | null;
    },
    ctx: z.RefinementCtx,
  ) => {
    if (!data.isInsuranceClaim) return;
    if (!data.insuranceCompany) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "insuranceCompany is required when isInsuranceClaim is true",
        path: ["insuranceCompany"],
      });
    }
    if (!data.claimFiled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "claimFiled is required when isInsuranceClaim is true",
        path: ["claimFiled"],
      });
    }
    if (!data.dateOfDamage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dateOfDamage is required when isInsuranceClaim is true",
        path: ["dateOfDamage"],
      });
    }
  });

export const PipelineTransitionSchema = z.object({
  entityType: PipelineEntityTypeSchema,
  entityId: z.string().uuid(),
  toStatus: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export type CreateLeadDto = z.input<typeof CreateLeadSchema>;
export type UpdateLeadDto = z.input<typeof UpdateLeadSchema>;
export type LeadQueryDto = z.input<typeof LeadQuerySchema>;
export type ConvertLeadDto = z.input<typeof ConvertLeadSchema>;
export type BulkAssignLeadsDto = z.input<typeof BulkAssignLeadsSchema>;
export type BulkUpdateLeadStatusDto = z.input<typeof BulkUpdateLeadStatusSchema>;
export type MarkLeadContactedDto = z.input<typeof MarkLeadContactedSchema>;
export type PipelineTransitionDto = z.input<typeof PipelineTransitionSchema>;
