import { ProjectStatus, ProjectPriority, ProjectType, PropertyType, TaskPriority, TaskStatus } from '@prisma/client';

export interface ProjectQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  projectType?: ProjectType;
  stageId?: string;
  clientId?: string;
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
  warrantyType?: string | null;
  warrantyYears?: number | null;
  tags?: string[];
  customFields?: Record<string, unknown> | null;
  internalNotes?: string | null;
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
  if (data.dueDate && !data.estimatedEndDate) data.estimatedEndDate = data.dueDate;
  if (data.progressPercentage !== undefined && data.completionPercentage === undefined) {
    data.completionPercentage = data.progressPercentage;
  }

  return data as CreateProjectDto;
}

