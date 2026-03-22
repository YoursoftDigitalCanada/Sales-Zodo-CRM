import { z } from "zod";

export const PROJECT_TYPE_OPTIONS = [
  { value: "REPAIR", label: "Repair" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "NEW_CONSTRUCTION", label: "New Construction" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "INSURANCE_CLAIM", label: "Insurance Claim" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "GUTTER", label: "Gutter" },
  { value: "SIDING", label: "Siding" },
  { value: "OTHER", label: "Other" },
] as const;

export const CANADIAN_PROVINCES = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
] as const;

export const PROPERTY_TYPE_OPTIONS = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "MULTI_FAMILY", label: "Multi-Family" },
  { value: "HOA", label: "HOA" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "INDUSTRIAL", label: "Industrial" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
] as const;

export const ROOF_TYPE_OPTIONS = [
  "Asphalt Shingle",
  "Metal",
  "Tile",
  "Slate",
  "Wood Shake",
  "TPO",
  "EPDM",
  "Modified Bitumen",
  "Built-Up",
  "Synthetic",
] as const;

export const CURRENT_ROOF_MATERIAL_OPTIONS = [
  "3-Tab Asphalt",
  "Architectural Asphalt",
  "Metal Standing Seam",
  "Corrugated Metal",
  "Clay Tile",
  "Concrete Tile",
  "Wood Shake",
  "Built-Up Roofing",
  "TPO",
  "EPDM",
  "Other",
] as const;

export const ROOF_PITCH_OPTIONS = [
  "Flat",
  "2/12",
  "3/12",
  "4/12",
  "5/12",
  "6/12",
  "7/12",
  "8/12",
  "9/12",
  "10/12+",
] as const;

export const STORIES_OPTIONS = ["1", "2", "3", "4+"] as const;

export const EXISTING_LAYERS_OPTIONS = ["1", "2", "3+"] as const;

export const ROOF_FEATURE_OPTIONS = [
  "Skylights",
  "Solar Panels",
  "Chimney",
  "Valleys",
  "Dormers",
  "Steep Slope",
  "Low Slope Sections",
  "Multiple Ridgelines",
] as const;

export const SHINGLE_MANUFACTURER_OPTIONS = [
  "GAF",
  "Owens Corning",
  "CertainTeed",
  "IKO",
  "Malarkey",
  "Atlas",
  "Other",
] as const;

export const SHINGLE_PRODUCTS_BY_MANUFACTURER: Record<string, string[]> = {
  GAF: ["Timberline HDZ", "Timberline UHD", "Grand Sequoia", "Royal Sovereign"],
  "Owens Corning": ["Duration", "Duration Designer", "Oakridge", "Berkshire"],
  CertainTeed: ["Landmark", "Landmark PRO", "Presidential Shake", "XT 25"],
  IKO: ["Cambridge", "Dynasty", "Marathon", "Nordic"],
  Malarkey: ["Highlander", "Vista", "Legacy", "Windsor"],
  Atlas: ["Pinnacle Pristine", "StormMaster Shake", "Castlebrook"],
  Other: ["Custom Product"],
};

export const SHINGLE_COLOR_OPTIONS = [
  "Charcoal",
  "Pewter Gray",
  "Weathered Wood",
  "Barkwood",
  "Slate",
  "Driftwood",
  "Brownwood",
  "Onyx Black",
  "Mission Brown",
  "Custom",
] as const;

export const UNDERLAYMENT_OPTIONS = [
  "Synthetic",
  "Felt #15",
  "Felt #30",
  "Ice & Water Shield",
  "Self-Adhered High Temp",
] as const;

export const ADDITIONAL_WORK_OPTIONS = [
  "Gutters",
  "Downspouts",
  "Fascia Repair",
  "Soffit Repair",
  "Decking Replacement",
  "Ventilation Upgrade",
  "Chimney Flashing",
  "Siding Repair",
  "Insulation",
] as const;

export const PERMIT_STATUS_OPTIONS = [
  "NOT_REQUIRED",
  "PENDING",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;

export const INSURANCE_COMPANY_OPTIONS = [
  "State Farm",
  "Allstate",
  "Farmers",
  "Liberty Mutual",
  "USAA",
  "Travelers",
  "Progressive",
  "Nationwide",
  "Other",
] as const;

export const INSURANCE_CLAIM_STATUS_OPTIONS = [
  "NEW",
  "FILED",
  "INSPECTION_SCHEDULED",
  "UNDER_REVIEW",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "DENIED",
  "SUPPLEMENT_SUBMITTED",
  "SUPPLEMENT_APPROVED",
  "CLOSED",
] as const;

export const PAYMENT_TERMS_OPTIONS = [
  "Due on Receipt",
  "50/50",
  "50/40/10",
  "30/40/30",
  "Insurance + Deductible",
  "Net 15",
  "Net 30",
] as const;

export const WARRANTY_TYPE_OPTIONS = [
  "Manufacturer Standard",
  "System Plus",
  "Silver Pledge",
  "Golden Pledge",
  "Workmanship Only",
  "Extended Workmanship",
] as const;

export const DURATION_OPTIONS = [
  "1 Day",
  "2-3 Days",
  "4-7 Days",
  "1-2 Weeks",
  "2-4 Weeks",
  "1+ Month",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));
const optionalEmail = z.string().trim().email("Enter a valid email").optional().or(z.literal(""));

const numeric = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : undefined;
  });

const currencyValue = numeric.refine((value) => value === undefined || value >= 0, "Must be 0 or greater");

const dateValue = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    return value;
  })
  .refine((value) => value === undefined || !Number.isNaN(new Date(value).getTime()), "Invalid date");

export const projectWizardSchema = z
  .object({
    // Step 1
    projectName: z.string().trim().min(2, "Project name is required"),
    projectType: z.enum(PROJECT_TYPE_OPTIONS.map((opt) => opt.value) as [string, ...string[]]),
    propertyType: z.enum(PROPERTY_TYPE_OPTIONS.map((opt) => opt.value) as [string, ...string[]]),
    description: optionalString,
    priority: z.enum(PRIORITY_OPTIONS.map((opt) => opt.value) as [string, ...string[]]),
    stageSelection: z.string().trim().min(1, "Stage is required"),
    tags: z.array(z.string().trim()).default([]),

    // Step 2
    clientSelection: z.enum(["existing", "new"]).default("existing"),
    clientId: optionalString,
    newClientFirstName: optionalString,
    newClientLastName: optionalString,
    newClientEmail: optionalEmail,
    newClientPhone: optionalString,
    newClientCompany: optionalString,

    sameAsClientAddress: z.boolean().default(false),
    jobSiteAddress: optionalString,
    jobSiteAddress2: optionalString,
    jobSiteCity: optionalString,
    jobSiteState: optionalString,
    jobSiteZip: optionalString,
    siteAccessNotes: optionalString,

    // Step 3
    roofType: z.string().trim().min(1, "Roof type is required"),
    currentRoofMaterial: optionalString,
    roofSquares: numeric.refine((value) => typeof value === "number" && value > 0, "Roof squares is required"),
    roofPitch: optionalString,
    stories: z.string().trim().min(1, "Stories is required"),
    existingLayers: optionalString,
    roofFeatures: z.array(z.string()).default([]),

    shingleManufacturer: z.string().trim().min(1, "Shingle manufacturer is required"),
    shingleProduct: optionalString,
    shingleColor: optionalString,
    underlaymentType: optionalString,

    additionalWork: z.array(z.string()).default([]),
    otherWorkDescription: optionalString,

    permitRequired: z.boolean().default(true),
    permitStatus: optionalString,
    permitNumber: optionalString,
    permitCost: currencyValue,

    // Step 4
    isInsuranceJob: z.boolean().default(false),
    insuranceCompany: optionalString,
    policyNumber: optionalString,
    claimNumber: optionalString,
    dateOfLoss: dateValue,
    deductible: currencyValue,
    claimStatus: optionalString,
    insuranceApprovedAmount: currencyValue,
    adjusterName: optionalString,
    adjusterId: optionalString,
    adjusterPhone: optionalString,
    adjusterEmail: optionalEmail,
    insuranceNotes: optionalString,

    // Step 5
    contractValue: numeric.refine((value) => typeof value === "number" && value >= 0, "Contract value is required"),
    estimatedMaterialCost: currencyValue,
    estimatedLaborCost: currencyValue,
    estimatedOtherCosts: currencyValue,
    paymentTerms: optionalString,
    warrantyType: optionalString,
    workmanshipWarrantyYears: numeric,
    estimatedStartDate: dateValue.refine((value) => !!value, "Estimated start date is required"),
    estimatedEndDate: dateValue,
    estimatedDuration: optionalString,

    // Step 6
    projectManagerId: z.string().trim().min(1, "Project manager is required"),
    salesRepId: optionalString,
    crewId: optionalString,
    assignCrewLater: z.boolean().default(true),

    notifyClient: z.boolean().default(true),
    notifyTeam: z.boolean().default(true),
    createTasksFromTemplate: z.boolean().default(true),

    internalNotes: optionalString,
    crewInstructions: optionalString,

    postCreateOpenProject: z.boolean().default(true),
    postCreateGenerateInvoice: z.boolean().default(false),
    postCreateScheduleInspection: z.boolean().default(false),
    postCreateUploadDocuments: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (values.clientSelection === "existing" && !values.clientId) {
      ctx.addIssue({
        path: ["clientId"],
        code: z.ZodIssueCode.custom,
        message: "Please select an existing client",
      });
    }

    if (values.clientSelection === "new") {
      if (!values.newClientFirstName) {
        ctx.addIssue({ path: ["newClientFirstName"], code: z.ZodIssueCode.custom, message: "First name is required" });
      }
      if (!values.newClientLastName) {
        ctx.addIssue({ path: ["newClientLastName"], code: z.ZodIssueCode.custom, message: "Last name is required" });
      }
      if (!values.newClientEmail) {
        ctx.addIssue({ path: ["newClientEmail"], code: z.ZodIssueCode.custom, message: "Email is required" });
      }
      if (!values.newClientPhone) {
        ctx.addIssue({ path: ["newClientPhone"], code: z.ZodIssueCode.custom, message: "Phone is required" });
      }
    }

    if (!values.sameAsClientAddress) {
      if (!values.jobSiteAddress) {
        ctx.addIssue({ path: ["jobSiteAddress"], code: z.ZodIssueCode.custom, message: "Job site address is required" });
      }
      if (!values.jobSiteCity) {
        ctx.addIssue({ path: ["jobSiteCity"], code: z.ZodIssueCode.custom, message: "City is required" });
      }
      if (!values.jobSiteState) {
        ctx.addIssue({ path: ["jobSiteState"], code: z.ZodIssueCode.custom, message: "Province is required" });
      }
      if (!values.jobSiteZip) {
        ctx.addIssue({ path: ["jobSiteZip"], code: z.ZodIssueCode.custom, message: "Postal code is required" });
      }
      if (values.jobSiteZip && !/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/i.test(values.jobSiteZip.trim())) {
        ctx.addIssue({ path: ["jobSiteZip"], code: z.ZodIssueCode.custom, message: "Enter a valid Canadian postal code (e.g. V3V 2Z0)" });
      }
    }

    if (values.permitRequired && !values.permitStatus) {
      ctx.addIssue({ path: ["permitStatus"], code: z.ZodIssueCode.custom, message: "Permit status is required" });
    }

    const insuranceRequired = values.isInsuranceJob || values.projectType === "INSURANCE_CLAIM";
    if (insuranceRequired && !values.insuranceCompany) {
      ctx.addIssue({
        path: ["insuranceCompany"],
        code: z.ZodIssueCode.custom,
        message: "Insurance company is required for insurance jobs",
      });
    }

    if (!values.assignCrewLater && !values.crewId) {
      ctx.addIssue({
        path: ["crewId"],
        code: z.ZodIssueCode.custom,
        message: "Select a crew or choose assign later",
      });
    }

    if (values.estimatedStartDate && values.estimatedEndDate) {
      const start = new Date(values.estimatedStartDate);
      const end = new Date(values.estimatedEndDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        ctx.addIssue({
          path: ["estimatedEndDate"],
          code: z.ZodIssueCode.custom,
          message: "End date must be after start date",
        });
      }
    }
  });

export type ProjectWizardFormValues = z.infer<typeof projectWizardSchema>;

export const projectWizardDefaultValues: ProjectWizardFormValues = {
  projectName: "",
  projectType: "REPLACEMENT",
  propertyType: "RESIDENTIAL",
  description: "",
  priority: "NORMAL",
  stageSelection: "",
  tags: [],

  clientSelection: "existing",
  clientId: "",
  newClientFirstName: "",
  newClientLastName: "",
  newClientEmail: "",
  newClientPhone: "",
  newClientCompany: "",

  sameAsClientAddress: false,
  jobSiteAddress: "",
  jobSiteAddress2: "",
  jobSiteCity: "",
  jobSiteState: "",
  jobSiteZip: "",
  siteAccessNotes: "",

  roofType: "",
  currentRoofMaterial: "",
  roofSquares: undefined,
  roofPitch: "",
  stories: "",
  existingLayers: "",
  roofFeatures: [],

  shingleManufacturer: "",
  shingleProduct: "",
  shingleColor: "",
  underlaymentType: "",

  additionalWork: [],
  otherWorkDescription: "",

  permitRequired: true,
  permitStatus: "PENDING",
  permitNumber: "",
  permitCost: undefined,

  isInsuranceJob: false,
  insuranceCompany: "",
  policyNumber: "",
  claimNumber: "",
  dateOfLoss: undefined,
  deductible: undefined,
  claimStatus: "",
  insuranceApprovedAmount: undefined,
  adjusterName: "",
  adjusterId: "",
  adjusterPhone: "",
  adjusterEmail: "",
  insuranceNotes: "",

  contractValue: undefined,
  estimatedMaterialCost: undefined,
  estimatedLaborCost: undefined,
  estimatedOtherCosts: undefined,
  paymentTerms: "",
  warrantyType: "",
  workmanshipWarrantyYears: undefined,
  estimatedStartDate: undefined,
  estimatedEndDate: undefined,
  estimatedDuration: "",

  projectManagerId: "",
  salesRepId: "",
  crewId: "",
  assignCrewLater: true,

  notifyClient: true,
  notifyTeam: true,
  createTasksFromTemplate: true,

  internalNotes: "",
  crewInstructions: "",

  postCreateOpenProject: true,
  postCreateGenerateInvoice: false,
  postCreateScheduleInspection: false,
  postCreateUploadDocuments: false,
};
