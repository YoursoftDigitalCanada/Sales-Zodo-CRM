import { CreateLeadSourceDto, UpdateLeadSourceDto, LeadSourceQueryDto, LeadSourceResponseDto, LeadSourceListResponseDto, LeadSourceWithStatsDto } from './lead-sources.dto';
export declare class LeadSourcesService {
    /**
     * Create lead source
     */
    create(tenantId: string, data: CreateLeadSourceDto): Promise<LeadSourceResponseDto>;
    /**
     * Get lead source by ID
     */
    getById(id: string, tenantId: string): Promise<LeadSourceResponseDto>;
    /**
     * Get lead sources with filters
     */
    getMany(tenantId: string, query: LeadSourceQueryDto): Promise<LeadSourceListResponseDto>;
    /**
     * Get all active lead sources (for dropdowns)
     */
    getActive(tenantId: string): Promise<LeadSourceResponseDto[]>;
    /**
     * Update lead source
     */
    update(id: string, tenantId: string, data: UpdateLeadSourceDto): Promise<LeadSourceResponseDto>;
    /**
     * Delete lead source
     */
    delete(id: string, tenantId: string): Promise<void>;
    /**
     * Get lead source statistics
     */
    getStatistics(tenantId: string): Promise<LeadSourceWithStatsDto[]>;
}
export declare const leadSourcesService: LeadSourcesService;
//# sourceMappingURL=lead-sources.service.d.ts.map