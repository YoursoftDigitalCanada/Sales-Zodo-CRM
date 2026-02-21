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
export declare function parsePaginationParams(params: PaginationParams): PaginatedQuery;
export declare function getPaginationMeta(total: number, page: number, limit: number): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
};
//# sourceMappingURL=pagination.d.ts.map