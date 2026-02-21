import { LeadStatus } from '@prisma/client';
import { CreateLeadDto, UpdateLeadDto, LeadResponseDto, ConvertLeadDto } from './leads.dto';
import { Request } from 'express';
/**
 * Leads Manager
 * Contains complex business logic and orchestration
 */
export declare class LeadsManager {
    /**
     * Create lead with audit logging and notifications
     */
    createLead(req: Request, tenantId: string, data: CreateLeadDto, createdById: string): Promise<LeadResponseDto>;
    /**
     * Update lead with audit logging
     */
    updateLead(req: Request, id: string, tenantId: string, data: UpdateLeadDto, employeeId: string): Promise<LeadResponseDto>;
    /**
     * Delete lead with audit logging
     */
    deleteLead(req: Request, id: string, tenantId: string): Promise<void>;
    /**
     * Update lead status with audit logging
     */
    updateLeadStatus(req: Request, id: string, tenantId: string, status: LeadStatus): Promise<LeadResponseDto>;
    /**
     * Assign lead with notifications
     */
    assignLead(req: Request, id: string, tenantId: string, assignedToId: string | null, assignerEmployeeId: string): Promise<LeadResponseDto>;
    /**
     * Bulk assign leads with notifications
     */
    bulkAssignLeads(req: Request, leadIds: string[], tenantId: string, assignedToId: string, assignerEmployeeId: string): Promise<number>;
    /**
     * Convert lead to client
     */
    convertLeadToClient(req: Request, leadId: string, tenantId: string, options: ConvertLeadDto): Promise<{
        clientId: string;
        contactId?: string;
    }>;
    /**
     * Add activity to lead
     */
    addActivity(tenantId: string, leadId: string, type: string, title: string, description?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Get lead activities
     */
    getActivities(tenantId: string, leadId: string, limit?: number): Promise<any[]>;
    /**
     * Import leads from data
     */
    importLeads(req: Request, tenantId: string, leads: CreateLeadDto[], createdById: string): Promise<{
        imported: number;
        failed: number;
        errors: string[];
    }>;
    /**
     * Export leads
     */
    exportLeads(req: Request, tenantId: string, query: any): Promise<any[]>;
}
export declare const leadsManager: LeadsManager;
//# sourceMappingURL=leads.manager.d.ts.map