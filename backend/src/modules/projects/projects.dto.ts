import { PermitStatus, ProjectStatus, ProjectPriority, ProjectType, PropertyType, TaskPriority, TaskStatus } from '@prisma/client';

export interface ProjectQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  projectType?: ProjectType;
  stageId?: string;
  clientId?: string;
  leadId?: string;
  projectManagerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface CreateProjectDto {
  name: string;
  projectNumber?: string;
  description?: string | null;
  clientId?: string | null;
  quoteId?: string | null;
  leadId?: string | null;
  projectType?: ProjectType;
  propertyType?: PropertyType;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  projectManagerId?: string | null;
  salesRepId?: string | null;
  stageId?: string | null;
  contractValue?: number | null;
  estimatedCost?: number | null;
  budget?: number | null;
  currency?: string | null;
  estimatedStartDate?: string | null;
  estimatedEndDate?: string | null;
  estimatedDuration?: number | null;
  roofType?: string | null;
  roofSquares?: number | null;
  roofPitch?: string | null;
  roofLayers?: number | null;
  stories?: number | null;
  shingleManufacturer?: string | null;
  shingleProduct?: string | null;
  shingleColor?: string | null;
  jobSiteAddress?: string | null;
  jobSiteAddress2?: string | null;
  jobSiteCity?: string | null;
  jobSiteState?: string | null;
  jobSiteZip?: string | null;
  jobSiteCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isInsuranceJob?: boolean;
  insuranceCompany?: string | null;
  claimNumber?: string | null;
  policyNumber?: string | null;
  deductible?: number | null;
  dateOfLoss?: string | null;
  permitRequired?: boolean;
  permitNumber?: string | null;
  permitStatus?: PermitStatus | null;
  permitPulledDate?: string | null;
  permitApprovedDate?: string | null;
  warrantyType?: string | null;
  warrantyYears?: number | null;
  tags?: string[];
  customFields?: Record<string, unknown> | null;
  internalNotes?: string | null;
  organization?: string | null;
  organizationName?: string | null;
  nextStep?: string | null;
  dealStatus?: string | null;
  dealOwnerId?: string | null;
  probability?: number | null;
  expectedDealValue?: number | null;
  dealValue?: number | null;
  expectedClosureDate?: string | null;
  closedDate?: string | null;
  sourceId?: string | null;
  leadName?: string | null;
  website?: string | null;
  noOfEmployees?: string | null;
  jobTitle?: string | null;
  territory?: string | null;
  exchangeRate?: number | null;
  annualRevenue?: number | null;
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobileNo?: string | null;
  phone?: string | null;
  gender?: string | null;
  contactId?: string | null;
  total?: number | null;
  netTotal?: number | null;
  lostReason?: string | null;
  lostNotes?: string | null;
}

export type UpdateProjectDto = Partial<CreateProjectDto>;

export interface CreateProjectTaskDto {
  title: string;
  description?: string;
  taskType?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedToId?: string;
  dueDate?: string;
  startDate?: string;
  estimatedMinutes?: number;
  sortOrder?: number;
  parentTaskId?: string;
  isChecklist?: boolean;
  checklistItems?: unknown;
}

export interface FinancialSummaryDto {
  contractValue: number;
  estimatedCost: number;
  actualCost: number;
  grossProfit: number;
  profitMargin: number;
  materialsCost: number;
  laborCost: number;
  expenseCost: number;
  invoiced: number;
  paid: number;
  outstanding: number;
}

export function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function normalizeProjectDto(input: Record<string, any>): CreateProjectDto {
  const data = { ...input };

  // backward compatibility with current frontend payload
  if (data.projectTitle && !data.name) data.name = data.projectTitle;
  if (data.organization && !data.name) data.name = data.organization;
  if (data.organizationName && !data.organization) data.organization = data.organizationName;
  if (data.name && !data.organization) data.organization = data.name;
  if (data.dealValue !== undefined && data.contractValue === undefined) data.contractValue = data.dealValue;
  if (data.expectedDealValue !== undefined && data.budget === undefined) data.budget = data.expectedDealValue;
  if (data.expectedClosureDate && !data.estimatedEndDate) data.estimatedEndDate = data.expectedClosureDate;
  if (data.dealStatus === 'Won' && !data.closedDate) data.closedDate = new Date().toISOString();
  if (data.leadName && !data.description) data.description = `Lead: ${data.leadName}`;
  if (data.dueDate && !data.estimatedEndDate) data.estimatedEndDate = data.dueDate;
  if (data.progressPercentage !== undefined && data.completionPercentage === undefined) {
    data.completionPercentage = data.progressPercentage;
  }

  return data as CreateProjectDto;
}
