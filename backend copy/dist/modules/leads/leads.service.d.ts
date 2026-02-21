import { CreateLeadDto, UpdateLeadDto, LeadQueryDto, LeadResponseDto, LeadListResponseDto, LeadPipelineDto, LeadStatisticsDto } from './leads.dto';
import { LeadStatus, LeadTemperature } from '@prisma/client';
export declare class LeadsService {
    /**
     * Create a new lead
     */
    create(tenantId: string, data: CreateLeadDto, createdById?: string): Promise<LeadResponseDto>;
    /**
     * Get lead by ID
     */
    getById(id: string, tenantId: string): Promise<LeadResponseDto>;
    /**
     * Get leads with filters and pagination
     */
    getMany(tenantId: string, query: LeadQueryDto): Promise<LeadListResponseDto>;
    /**
     * Update lead
     */
    update(id: string, tenantId: string, data: UpdateLeadDto): Promise<LeadResponseDto>;
    /**
     * Delete lead
     */
    delete(id: string, tenantId: string): Promise<void>;
    /**
     * Update lead status
     */
    updateStatus(id: string, tenantId: string, status: LeadStatus): Promise<LeadResponseDto>;
    /**
     * Assign lead to employee
     */
    assign(id: string, tenantId: string, assignedToId: string | null): Promise<LeadResponseDto>;
    /**
     * Bulk assign leads
     */
    bulkAssign(leadIds: string[], tenantId: string, assignedToId: string): Promise<number>;
    /**
     * Bulk update status
     */
    bulkUpdateStatus(leadIds: string[], tenantId: string, status: LeadStatus): Promise<number>;
    /**
     * Get pipeline data
     */
    getPipeline(tenantId: string, filters?: {
        assignedToId?: string;
        leadSourceId?: string;
        temperature?: LeadTemperature;
    }): Promise<LeadPipelineDto[]>;
    /**
     * Get lead statistics
     */
    getStatistics(tenantId: string, startDate?: Date, endDate?: Date): Promise<LeadStatisticsDto>;
    /**
     * Get lead for update/delete (with ownership check)
     */
    getForModification(id: string, tenantId: string, employeeId: string, permissions: string[]): Promise<LeadResponseDto>;
}
export declare const leadsService: LeadsService;
//# sourceMappingURL=leads.service.d.ts.map