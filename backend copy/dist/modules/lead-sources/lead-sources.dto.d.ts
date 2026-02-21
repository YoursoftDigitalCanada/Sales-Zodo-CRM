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
    };
}
export declare function toLeadSourceResponseDto(source: any): LeadSourceResponseDto;
//# sourceMappingURL=lead-sources.dto.d.ts.map