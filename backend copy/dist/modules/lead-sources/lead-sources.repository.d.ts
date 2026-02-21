import { Prisma } from '@prisma/client';
import { CreateLeadSourceDto, UpdateLeadSourceDto, LeadSourceQueryDto } from './lead-sources.dto';
export declare class LeadSourcesRepository {
    /**
     * Create lead source
     */
    create(tenantId: string, data: CreateLeadSourceDto): Promise<{
        _count: {
            leads: number;
        };
    } & {
        tenantId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    /**
     * Find lead source by ID
     */
    findById(id: string, tenantId: string): Promise<({
        _count: {
            leads: number;
        };
    } & {
        tenantId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }) | null>;
    /**
     * Find lead source by name (for uniqueness check)
     */
    findByName(name: string, tenantId: string, excludeId?: string): Promise<{
        tenantId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    } | null>;
    /**
     * Find lead sources with filters
     */
    findMany(tenantId: string, query: LeadSourceQueryDto): Promise<{
        data: ({
            _count: {
                leads: number;
            };
        } & {
            tenantId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        })[];
        total: number;
    }>;
    /**
     * Update lead source
     */
    update(id: string, tenantId: string, data: UpdateLeadSourceDto): Promise<{
        _count: {
            leads: number;
        };
    } & {
        tenantId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    /**
     * Delete lead source
     */
    delete(id: string, tenantId: string): Promise<Prisma.BatchPayload>;
    /**
     * Get lead source statistics
     */
    getStatistics(tenantId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        leadCount: number;
        convertedCount: number;
        conversionRate: number;
        totalValue: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    /**
     * Check if lead source has leads
     */
    hasLeads(id: string, tenantId: string): Promise<boolean>;
}
export declare const leadSourcesRepository: LeadSourcesRepository;
//# sourceMappingURL=lead-sources.repository.d.ts.map