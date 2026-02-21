export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedQuery {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export function parsePaginationParams(params: PaginationParams): PaginatedQuery {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;
  
  const result: PaginatedQuery = {
    skip,
    take: limit,
  };
  
  if (params.sortBy) {
    result.orderBy = {
      [params.sortBy]: params.sortOrder || 'desc',
    };
  }
  
  return result;
}

export function getPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}