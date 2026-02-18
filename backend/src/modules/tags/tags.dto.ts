// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface CreateTagDto {
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

export interface TagQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface TagResponseDto {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagListResponseDto {
  data: TagResponseDto[];
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

export function toTagResponseDto(tag: any): TagResponseDto {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color || undefined,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}