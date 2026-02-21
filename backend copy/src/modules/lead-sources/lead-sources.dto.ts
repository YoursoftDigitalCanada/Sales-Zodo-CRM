// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface CreateLeadSourceDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateLeadSourceDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface LeadSourceQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface LeadSourceResponseDto {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  leadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadSourceWithStatsDto extends LeadSourceResponseDto {
  leadCount: number;
  convertedCount: number;
  conversionRate: number;
  totalValue: number;
}

export interface LeadSourceListResponseDto {
  data: LeadSourceResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ============================================================================
// MAPPER
// ============================================================================

export function toLeadSourceResponseDto(source: any): LeadSourceResponseDto {
  return {
    id: source.id,
    name: source.name,
    description: source.description || undefined,
    isActive: source.isActive,
    leadCount: source._count?.leads,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}