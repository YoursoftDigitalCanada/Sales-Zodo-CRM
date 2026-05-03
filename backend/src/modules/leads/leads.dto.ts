import { LeadStatus, LeadTemperature, EstimationMethod } from '@prisma/client';

// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface CreateLeadDto {
  // Basic Info
  salutation?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  email?: string;
  phone?: string;
  mobileNo?: string;
  location?: string;

  // Company Info
  organization?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  territory?: string;
  industry?: string;
  companySize?: string;
  annualRevenue?: number;
  useCase?: string;

  // Classification
  status?: LeadStatus;
  temperature?: LeadTemperature;
  potentialValue?: number;

  // Source
  leadSourceId?: string;

  // Assignment
  assignedToId?: string;

  // Notes & Tags
  notes?: string;
  tagIds?: string[];

  // CRM-develop details
  converted?: boolean;
  facebookLeadId?: string;
  facebookFormId?: string;
  lostReason?: string;
  lostNotes?: string;

  // ── Stage 1: Property Info ───────────────────────────────────────────
  propertyAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;

  // ── Stage 1: Service Request ─────────────────────────────────────────
  serviceType?: string;
  isInsuranceClaim?: string;
  urgencyLevel?: string;
  preferredContactMethod?: string;
  bestTimeToContact?: string;
  issueDescription?: string;

  // ── Stage 1: UTM / Auto-captured ─────────────────────────────────────
  leadSourceUTM?: string;
  leadCampaignUTM?: string;
  leadMediumUTM?: string;
  landingPageURL?: string;
  ipAddress?: string;
  deviceType?: string;
  browserType?: string;

  // ── Stage 2: Verification ────────────────────────────────────────────
  confirmedName?: boolean;
  confirmedPhone?: boolean;
  confirmedEmail?: boolean;
  confirmedAddress?: boolean;
  secondaryPhone?: string;
  spouseCoOwnerName?: string;

  // ── Stage 2: Ownership ───────────────────────────────────────────────
  isHomeowner?: string;
  isDecisionMaker?: string;
  ownershipType?: string;

  // ── Stage 2: Roof Details ────────────────────────────────────────────
  roofAge?: string;
  currentRoofMaterial?: string;
  numberOfStories?: string;
  knownDamageType?: string[];
  damageOccurrenceDate?: string;
  previousRoofWork?: string;
  previousRoofWorkDetails?: string;

  // ── Stage 2: Insurance ───────────────────────────────────────────────
  insuranceCompanyName?: string;
  hasClaimBeenFiled?: string;
  claimNumber?: string;
  adjusterAssigned?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  adjusterMeetingDate?: string;

  // ── Stage 2: Budget & Timeline ───────────────────────────────────────
  budgetRange?: string;
  workTimeline?: string;
  financingNeeded?: string;
  gettingOtherQuotes?: string;
  numberOfOtherQuotes?: number;
  topPriority?: string;

  // ── Stage 2: HOA ─────────────────────────────────────────────────────
  isHOA?: string;
  hoaRestrictions?: string;

  // ── Stage 2: Sales Assessment ────────────────────────────────────────
  leadScore?: number;
  estimationMethod?: EstimationMethod;
  disqualifiedReason?: string;
  nextStep?: string;
  followUpDateTime?: string;
  inspectionAppointmentDate?: string;
  qualificationCallNotes?: string;

  // Closure / Inactive State Fields
  closureReason?: string;
  duplicateOfLeadId?: string;
  closedAt?: string;
  reactivateAt?: string;
}

export interface UpdateLeadDto {
  // Basic Info
  salutation?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  mobileNo?: string;
  location?: string;

  // Company Info
  organization?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  territory?: string;
  industry?: string;
  companySize?: string;
  annualRevenue?: number;
  useCase?: string;

  // Classification
  status?: LeadStatus;
  temperature?: LeadTemperature;
  potentialValue?: number;

  // Source
  leadSourceId?: string;

  // Assignment
  assignedToId?: string;

  // Notes & Tags
  notes?: string;
  tagIds?: string[];

  // CRM-develop details
  converted?: boolean;
  facebookLeadId?: string;
  facebookFormId?: string;
  lostReason?: string;
  lostNotes?: string;

  // ── Stage 1: Property Info ───────────────────────────────────────────
  propertyAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;

  // ── Stage 1: Service Request ─────────────────────────────────────────
  serviceType?: string;
  isInsuranceClaim?: string;
  urgencyLevel?: string;
  preferredContactMethod?: string;
  bestTimeToContact?: string;
  issueDescription?: string;

  // ── Stage 1: UTM / Auto-captured ─────────────────────────────────────
  leadSourceUTM?: string;
  leadCampaignUTM?: string;
  leadMediumUTM?: string;
  landingPageURL?: string;
  ipAddress?: string;
  deviceType?: string;
  browserType?: string;

  // ── Stage 2: Verification ────────────────────────────────────────────
  confirmedName?: boolean;
  confirmedPhone?: boolean;
  confirmedEmail?: boolean;
  confirmedAddress?: boolean;
  secondaryPhone?: string;
  spouseCoOwnerName?: string;

  // ── Stage 2: Ownership ───────────────────────────────────────────────
  isHomeowner?: string;
  isDecisionMaker?: string;
  ownershipType?: string;

  // ── Stage 2: Roof Details ────────────────────────────────────────────
  roofAge?: string;
  currentRoofMaterial?: string;
  numberOfStories?: string;
  knownDamageType?: string[];
  damageOccurrenceDate?: string;
  previousRoofWork?: string;
  previousRoofWorkDetails?: string;

  // ── Stage 2: Insurance ───────────────────────────────────────────────
  insuranceCompanyName?: string;
  hasClaimBeenFiled?: string;
  claimNumber?: string;
  adjusterAssigned?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  adjusterMeetingDate?: string;

  // ── Stage 2: Budget & Timeline ───────────────────────────────────────
  budgetRange?: string;
  workTimeline?: string;
  financingNeeded?: string;
  gettingOtherQuotes?: string;
  numberOfOtherQuotes?: number;
  topPriority?: string;

  // ── Stage 2: HOA ─────────────────────────────────────────────────────
  isHOA?: string;
  hoaRestrictions?: string;

  // ── Stage 2: Sales Assessment ────────────────────────────────────────
  leadScore?: number;
  estimationMethod?: EstimationMethod;
  disqualifiedReason?: string;
  nextStep?: string;
  followUpDateTime?: string;
  inspectionAppointmentDate?: string;
  qualificationCallNotes?: string;

  // Closure / Inactive State Fields
  closureReason?: string;
  duplicateOfLeadId?: string;
  closedAt?: string;
  reactivateAt?: string;
}

export interface LeadQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: LeadStatus;
  temperature?: LeadTemperature;
  leadSourceId?: string;
  assignedToId?: string;
  convertedToClientId?: string;
  convertedToContactId?: string;
  convertedToDealId?: string;
  startDate?: Date;
  endDate?: Date;
  minValue?: number;
  maxValue?: number;
}

export interface ConvertLeadDto {
  clientType: 'INDIVIDUAL' | 'COMPANY' | 'BUSINESS';
  createContact?: boolean;
  createClient?: boolean;
}

export interface MarkLeadContactedDto {
  propertyType: string;
  numberOfStories: string;
  approxRoofAge: string;
  currentRoofMaterial?: string | null;

  mainIssue: string[];
  urgencyLevel: string;
  issueStartTimeline: string;

  isInsuranceClaim: boolean;
  insuranceCompany?: string | null;
  claimFiled?: string | null;
  dateOfDamage?: Date | string | null;
  claimNumber?: string | null;

  decisionMaker: string;
  decisionTimeline: string;
  gettingOtherQuotes?: boolean | null;

  contactNotes: string;
  leadTemperature: string;
  estimatedDealValue: number;
}

export interface BulkAssignLeadsDto {
  leadIds: string[];
  assignedToId: string;
}

export interface BulkUpdateStatusDto {
  leadIds: string[];
  status: LeadStatus;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface LeadResponseDto {
  id: string;
  leadNumber?: string;
  salutation?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  gender?: string;
  email?: string;
  phone?: string;
  mobileNo?: string;
  location?: string;
  organization?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  territory?: string;
  industry?: string;
  companySize?: string;
  annualRevenue?: number;
  useCase?: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  potentialValue?: number;
  notes?: string;
  converted?: boolean;
  facebookLeadId?: string;
  facebookFormId?: string;
  lostReason?: string;
  lostNotes?: string;
  leadSource?: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    userId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  tags: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  createdBy?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  convertedAt?: Date;
  convertedToClientId?: string;
  convertedToContactId?: string;
  convertedToDealId?: string;
  convertedToClient?: {
    id: string;
    clientName: string;
    primaryEmail?: string;
  };
  convertedToContact?: {
    id: string;
    contactName: string;
    email?: string;
  };
  convertedToDeal?: {
    id: string;
    name: string;
    dealStatus?: string;
    dealValue?: number;
  };

  // ── Stage 1: Property Info ───────────────────────────────────────────
  propertyAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;

  // ── Stage 1: Service Request ─────────────────────────────────────────
  serviceType?: string;
  isInsuranceClaim?: string;
  urgencyLevel?: string;
  preferredContactMethod?: string;
  bestTimeToContact?: string;
  issueDescription?: string;

  // ── Stage 1: UTM / Auto-captured ─────────────────────────────────────
  leadSourceUTM?: string;
  leadCampaignUTM?: string;
  leadMediumUTM?: string;
  landingPageURL?: string;
  ipAddress?: string;
  deviceType?: string;
  browserType?: string;

  // ── Stage 2: Verification ────────────────────────────────────────────
  confirmedName?: boolean;
  confirmedPhone?: boolean;
  confirmedEmail?: boolean;
  confirmedAddress?: boolean;
  secondaryPhone?: string;
  spouseCoOwnerName?: string;

  // ── Stage 2: Ownership ───────────────────────────────────────────────
  isHomeowner?: string;
  isDecisionMaker?: string;
  ownershipType?: string;

  // ── Stage 2: Roof Details ────────────────────────────────────────────
  roofAge?: string;
  currentRoofMaterial?: string;
  numberOfStories?: string;
  knownDamageType?: string[];
  damageOccurrenceDate?: string;
  previousRoofWork?: string;
  previousRoofWorkDetails?: string;

  // ── Stage 2: Insurance ───────────────────────────────────────────────
  insuranceCompanyName?: string;
  hasClaimBeenFiled?: string;
  claimNumber?: string;
  adjusterAssigned?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  adjusterMeetingDate?: Date;

  // ── Stage 2: Budget & Timeline ───────────────────────────────────────
  budgetRange?: string;
  workTimeline?: string;
  financingNeeded?: string;
  gettingOtherQuotes?: string;
  numberOfOtherQuotes?: number;
  topPriority?: string;

  // ── Stage 2: HOA ─────────────────────────────────────────────────────
  isHOA?: string;
  hoaRestrictions?: string;

  // ── Stage 2: Sales Assessment ────────────────────────────────────────
  leadScore?: number;
  estimationMethod?: EstimationMethod;
  disqualifiedReason?: string;
  nextStep?: string;
  followUpDateTime?: Date;
  inspectionAppointmentDate?: Date;
  qualificationCallNotes?: string;

  // Closure / Inactive State Fields
  closureReason?: string;
  duplicateOfLeadId?: string;
  closedAt?: Date;
  reactivateAt?: Date;

  contactedDetails?: {
    id: string;
    propertyType: string;
    numberOfStories: string;
    approxRoofAge: string;
    currentRoofMaterial?: string;
    mainIssue: string[];
    urgencyLevel: string;
    issueStartTimeline: string;
    isInsuranceClaim: boolean;
    insuranceCompany?: string;
    claimFiled?: string;
    dateOfDamage?: Date;
    claimNumber?: string;
    decisionMaker: string;
    decisionTimeline: string;
    gettingOtherQuotes?: boolean;
    contactNotes: string;
    leadTemperature: string;
    estimatedDealValue: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface LeadListResponseDto {
  data: LeadResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface LeadPipelineDto {
  status: LeadStatus;
  count: number;
  totalValue: number;
  leads: LeadResponseDto[];
}

export interface LeadStatisticsDto {
  total: number;
  byStatus: Record<LeadStatus, number>;
  byTemperature: Record<LeadTemperature, number>;
  bySource: Array<{ sourceId: string; sourceName: string; count: number }>;
  totalValue: number;
  averageValue: number;
  conversionRate: number;
  newThisMonth: number;
  convertedThisMonth: number;
}

// ============================================================================
// MAPPER
// ============================================================================

export function toLeadResponseDto(lead: any): LeadResponseDto {
  return {
    id: lead.id,
    leadNumber: lead.leadNumber || undefined,
    salutation: lead.salutation || undefined,
    firstName: lead.firstName,
    middleName: lead.middleName || undefined,
    lastName: lead.lastName,
    fullName: [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(' '),
    gender: lead.gender || undefined,
    email: lead.email || undefined,
    phone: lead.phone || undefined,
    mobileNo: lead.mobileNo || undefined,
    location: lead.location || undefined,
    organization: lead.organization || undefined,
    companyName: lead.companyName || undefined,
    jobTitle: lead.jobTitle || undefined,
    website: lead.website || undefined,
    territory: lead.territory || undefined,
    industry: lead.industry || undefined,
    companySize: lead.companySize || undefined,
    annualRevenue: lead.annualRevenue ? Number(lead.annualRevenue) : undefined,
    useCase: lead.useCase || undefined,
    status: lead.status,
    temperature: lead.temperature,
    potentialValue: lead.potentialValue ? Number(lead.potentialValue) : undefined,
    notes: lead.notes || undefined,
    converted: lead.converted ?? false,
    facebookLeadId: lead.facebookLeadId || undefined,
    facebookFormId: lead.facebookFormId || undefined,
    lostReason: lead.lostReason || undefined,
    lostNotes: lead.lostNotes || undefined,
    leadSource: lead.leadSource
      ? {
        id: lead.leadSource.id,
        name: lead.leadSource.name,
      }
      : undefined,
    assignedTo: lead.assignedTo
      ? {
        id: lead.assignedTo.id,
        userId: lead.assignedTo.userId,
        user: {
          firstName: lead.assignedTo.user.firstName,
          lastName: lead.assignedTo.user.lastName,
          email: lead.assignedTo.user.email,
        },
      }
      : undefined,
    tags: lead.tags?.map((lt: any) => ({
      id: lt.tag.id,
      name: lt.tag.name,
      color: lt.tag.color || undefined,
    })) || [],
    createdBy: lead.createdBy
      ? {
        id: lead.createdBy.id,
        user: {
          firstName: lead.createdBy.user.firstName,
          lastName: lead.createdBy.user.lastName,
        },
      }
      : undefined,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    convertedAt: lead.convertedAt || undefined,
    convertedToClientId: lead.convertedToClientId || undefined,
    convertedToContactId: lead.convertedToContactId || undefined,
    convertedToDealId: lead.convertedToDealId || undefined,
    convertedToClient: lead.convertedToClient
      ? {
        id: lead.convertedToClient.id,
        clientName: lead.convertedToClient.clientName,
        primaryEmail: lead.convertedToClient.primaryEmail || undefined,
      }
      : undefined,
    convertedToContact: lead.convertedToContact
      ? {
        id: lead.convertedToContact.id,
        contactName: lead.convertedToContact.contactName,
        email: lead.convertedToContact.email || undefined,
      }
      : undefined,
    convertedToDeal: lead.convertedToDeal
      ? {
        id: lead.convertedToDeal.id,
        name: lead.convertedToDeal.name,
        dealStatus: lead.convertedToDeal.dealStatus || undefined,
        dealValue: lead.convertedToDeal.dealValue ? Number(lead.convertedToDeal.dealValue) : undefined,
      }
      : undefined,

    // ── Stage 1: Property Info ─────────────────────────────────────────
    propertyAddress: lead.propertyAddress || undefined,
    city: lead.city || undefined,
    state: lead.state || undefined,
    zipCode: lead.zipCode || undefined,
    propertyType: lead.propertyType || undefined,

    // ── Stage 1: Service Request ───────────────────────────────────────
    serviceType: lead.serviceType || undefined,
    isInsuranceClaim: lead.isInsuranceClaim || undefined,
    urgencyLevel: lead.urgencyLevel || undefined,
    preferredContactMethod: lead.preferredContactMethod || undefined,
    bestTimeToContact: lead.bestTimeToContact || undefined,
    issueDescription: lead.issueDescription || undefined,

    // ── Stage 1: UTM / Auto-captured ───────────────────────────────────
    leadSourceUTM: lead.leadSourceUTM || undefined,
    leadCampaignUTM: lead.leadCampaignUTM || undefined,
    leadMediumUTM: lead.leadMediumUTM || undefined,
    landingPageURL: lead.landingPageURL || undefined,
    ipAddress: lead.ipAddress || undefined,
    deviceType: lead.deviceType || undefined,
    browserType: lead.browserType || undefined,

    // ── Stage 2: Verification ──────────────────────────────────────────
    confirmedName: lead.confirmedName ?? false,
    confirmedPhone: lead.confirmedPhone ?? false,
    confirmedEmail: lead.confirmedEmail ?? false,
    confirmedAddress: lead.confirmedAddress ?? false,
    secondaryPhone: lead.secondaryPhone || undefined,
    spouseCoOwnerName: lead.spouseCoOwnerName || undefined,

    // ── Stage 2: Ownership ─────────────────────────────────────────────
    isHomeowner: lead.isHomeowner || undefined,
    isDecisionMaker: lead.isDecisionMaker || undefined,
    ownershipType: lead.ownershipType || undefined,

    // ── Stage 2: Roof Details ──────────────────────────────────────────
    roofAge: lead.roofAge || undefined,
    currentRoofMaterial: lead.currentRoofMaterial || undefined,
    numberOfStories: lead.numberOfStories || undefined,
    knownDamageType: lead.knownDamageType || undefined,
    damageOccurrenceDate: lead.damageOccurrenceDate || undefined,
    previousRoofWork: lead.previousRoofWork || undefined,
    previousRoofWorkDetails: lead.previousRoofWorkDetails || undefined,

    // ── Stage 2: Insurance ─────────────────────────────────────────────
    insuranceCompanyName: lead.insuranceCompanyName || undefined,
    hasClaimBeenFiled: lead.hasClaimBeenFiled || undefined,
    claimNumber: lead.claimNumber || undefined,
    adjusterAssigned: lead.adjusterAssigned || undefined,
    adjusterName: lead.adjusterName || undefined,
    adjusterPhone: lead.adjusterPhone || undefined,
    adjusterEmail: lead.adjusterEmail || undefined,
    adjusterMeetingDate: lead.adjusterMeetingDate || undefined,

    // ── Stage 2: Budget & Timeline ─────────────────────────────────────
    budgetRange: lead.budgetRange || undefined,
    workTimeline: lead.workTimeline || undefined,
    financingNeeded: lead.financingNeeded || undefined,
    gettingOtherQuotes: lead.gettingOtherQuotes || undefined,
    numberOfOtherQuotes: lead.numberOfOtherQuotes ?? undefined,
    topPriority: lead.topPriority || undefined,

    // ── Stage 2: HOA ───────────────────────────────────────────────────
    isHOA: lead.isHOA || undefined,
    hoaRestrictions: lead.hoaRestrictions || undefined,

    // ── Stage 2: Sales Assessment ──────────────────────────────────────
    leadScore: lead.leadScore ?? undefined,
    estimationMethod: lead.estimationMethod || undefined,
    disqualifiedReason: lead.disqualifiedReason || undefined,
    nextStep: lead.nextStep || undefined,
    followUpDateTime: lead.followUpDateTime || undefined,
    inspectionAppointmentDate: lead.inspectionAppointmentDate || undefined,
    qualificationCallNotes: lead.qualificationCallNotes || undefined,

    // Closure / Inactive State Fields
    closureReason: lead.closureReason || undefined,
    duplicateOfLeadId: lead.duplicateOfLeadId || undefined,
    closedAt: lead.closedAt || undefined,
    reactivateAt: lead.reactivateAt || undefined,

    contactedDetails: lead.contactedDetails
      ? {
        id: lead.contactedDetails.id,
        propertyType: lead.contactedDetails.propertyType,
        numberOfStories: lead.contactedDetails.numberOfStories,
        approxRoofAge: lead.contactedDetails.approxRoofAge,
        currentRoofMaterial: lead.contactedDetails.currentRoofMaterial || undefined,
        mainIssue: lead.contactedDetails.mainIssue || [],
        urgencyLevel: lead.contactedDetails.urgencyLevel,
        issueStartTimeline: lead.contactedDetails.issueStartTimeline,
        isInsuranceClaim: lead.contactedDetails.isInsuranceClaim,
        insuranceCompany: lead.contactedDetails.insuranceCompany || undefined,
        claimFiled: lead.contactedDetails.claimFiled || undefined,
        dateOfDamage: lead.contactedDetails.dateOfDamage || undefined,
        claimNumber: lead.contactedDetails.claimNumber || undefined,
        decisionMaker: lead.contactedDetails.decisionMaker,
        decisionTimeline: lead.contactedDetails.decisionTimeline,
        gettingOtherQuotes: lead.contactedDetails.gettingOtherQuotes ?? undefined,
        contactNotes: lead.contactedDetails.contactNotes,
        leadTemperature: lead.contactedDetails.leadTemperature,
        estimatedDealValue: Number(lead.contactedDetails.estimatedDealValue),
        createdAt: lead.contactedDetails.createdAt,
        updatedAt: lead.contactedDetails.updatedAt,
      }
      : undefined,
  };
}
