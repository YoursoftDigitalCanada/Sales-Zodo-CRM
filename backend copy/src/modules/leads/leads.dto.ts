import { LeadStatus, LeadTemperature } from '@prisma/client';

// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface CreateLeadDto {
  // Basic Info
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  location?: string;

  // Company Info
  companyName?: string;
  jobTitle?: string;
  website?: string;

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
}

export interface UpdateLeadDto {
  // Basic Info
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;

  // Company Info
  companyName?: string;
  jobTitle?: string;
  website?: string;

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
  startDate?: Date;
  endDate?: Date;
  minValue?: number;
  maxValue?: number;
}

export interface ConvertLeadDto {
  clientType: 'INDIVIDUAL' | 'COMPANY';
  createContact?: boolean;
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
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  potentialValue?: number;
  notes?: string;
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
    firstName: lead.firstName,
    lastName: lead.lastName,
    fullName: `${lead.firstName} ${lead.lastName}`,
    email: lead.email || undefined,
    phone: lead.phone || undefined,
    location: lead.location || undefined,
    companyName: lead.companyName || undefined,
    jobTitle: lead.jobTitle || undefined,
    website: lead.website || undefined,
    status: lead.status,
    temperature: lead.temperature,
    potentialValue: lead.potentialValue ? Number(lead.potentialValue) : undefined,
    notes: lead.notes || undefined,
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
  };
}