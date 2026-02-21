import { LeadStatus, LeadTemperature, Prisma } from '@prisma/client';
import { CreateLeadDto, UpdateLeadDto, LeadQueryDto } from './leads.dto';
export declare class LeadsRepository {
    private readonly defaultInclude;
    /**
     * Create a new lead
     */
    create(tenantId: string, data: CreateLeadDto, createdById?: string): Promise<{
        leadSource: {
            tenantId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
        tags: ({
            tag: {
                tenantId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                color: string | null;
            };
        } & {
            id: string;
            tagId: string;
            leadId: string;
        })[];
        assignedTo: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.LeadStatus;
        email: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        location: string | null;
        companyName: string | null;
        jobTitle: string | null;
        website: string | null;
        temperature: import(".prisma/client").$Enums.LeadTemperature;
        potentialValue: Prisma.Decimal | null;
        leadSourceId: string | null;
        assignedToId: string | null;
        notes: string | null;
        convertedAt: Date | null;
        convertedToClientId: string | null;
        createdById: string | null;
    }>;
    /**
     * Find lead by ID
     */
    findById(id: string, tenantId: string): Promise<({
        leadSource: {
            tenantId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
        tags: ({
            tag: {
                tenantId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                color: string | null;
            };
        } & {
            id: string;
            tagId: string;
            leadId: string;
        })[];
        assignedTo: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.LeadStatus;
        email: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        location: string | null;
        companyName: string | null;
        jobTitle: string | null;
        website: string | null;
        temperature: import(".prisma/client").$Enums.LeadTemperature;
        potentialValue: Prisma.Decimal | null;
        leadSourceId: string | null;
        assignedToId: string | null;
        notes: string | null;
        convertedAt: Date | null;
        convertedToClientId: string | null;
        createdById: string | null;
    }) | null>;
    /**
     * Find leads with filters and pagination
     */
    findMany(tenantId: string, query: LeadQueryDto): Promise<{
        data: ({
            leadSource: {
                tenantId: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            } | null;
            tags: ({
                tag: {
                    tenantId: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    color: string | null;
                };
            } & {
                id: string;
                tagId: string;
                leadId: string;
            })[];
            assignedTo: ({
                user: {
                    email: string;
                    id: string;
                    firstName: string;
                    lastName: string;
                    avatar: string | null;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
            createdBy: ({
                user: {
                    id: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
        } & {
            status: import(".prisma/client").$Enums.LeadStatus;
            email: string | null;
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            firstName: string;
            lastName: string;
            phone: string | null;
            location: string | null;
            companyName: string | null;
            jobTitle: string | null;
            website: string | null;
            temperature: import(".prisma/client").$Enums.LeadTemperature;
            potentialValue: Prisma.Decimal | null;
            leadSourceId: string | null;
            assignedToId: string | null;
            notes: string | null;
            convertedAt: Date | null;
            convertedToClientId: string | null;
            createdById: string | null;
        })[];
        total: number;
    }>;
    /**
     * Update lead
     */
    update(id: string, tenantId: string, data: UpdateLeadDto): Promise<{
        leadSource: {
            tenantId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
        tags: ({
            tag: {
                tenantId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                color: string | null;
            };
        } & {
            id: string;
            tagId: string;
            leadId: string;
        })[];
        assignedTo: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.LeadStatus;
        email: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        location: string | null;
        companyName: string | null;
        jobTitle: string | null;
        website: string | null;
        temperature: import(".prisma/client").$Enums.LeadTemperature;
        potentialValue: Prisma.Decimal | null;
        leadSourceId: string | null;
        assignedToId: string | null;
        notes: string | null;
        convertedAt: Date | null;
        convertedToClientId: string | null;
        createdById: string | null;
    }>;
    /**
     * Delete lead
     */
    delete(id: string, tenantId: string): Promise<Prisma.BatchPayload>;
    /**
     * Update lead status
     */
    updateStatus(id: string, tenantId: string, status: LeadStatus): Promise<{
        leadSource: {
            tenantId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
        tags: ({
            tag: {
                tenantId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                color: string | null;
            };
        } & {
            id: string;
            tagId: string;
            leadId: string;
        })[];
        assignedTo: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.LeadStatus;
        email: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        location: string | null;
        companyName: string | null;
        jobTitle: string | null;
        website: string | null;
        temperature: import(".prisma/client").$Enums.LeadTemperature;
        potentialValue: Prisma.Decimal | null;
        leadSourceId: string | null;
        assignedToId: string | null;
        notes: string | null;
        convertedAt: Date | null;
        convertedToClientId: string | null;
        createdById: string | null;
    }>;
    /**
     * Assign lead to employee
     */
    assign(id: string, tenantId: string, assignedToId: string | null): Promise<{
        leadSource: {
            tenantId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
        tags: ({
            tag: {
                tenantId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                color: string | null;
            };
        } & {
            id: string;
            tagId: string;
            leadId: string;
        })[];
        assignedTo: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.LeadStatus;
        email: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        location: string | null;
        companyName: string | null;
        jobTitle: string | null;
        website: string | null;
        temperature: import(".prisma/client").$Enums.LeadTemperature;
        potentialValue: Prisma.Decimal | null;
        leadSourceId: string | null;
        assignedToId: string | null;
        notes: string | null;
        convertedAt: Date | null;
        convertedToClientId: string | null;
        createdById: string | null;
    }>;
    /**
     * Bulk assign leads
     */
    bulkAssign(ids: string[], tenantId: string, assignedToId: string): Promise<Prisma.BatchPayload>;
    /**
     * Bulk update status
     */
    bulkUpdateStatus(ids: string[], tenantId: string, status: LeadStatus): Promise<Prisma.BatchPayload>;
    /**
     * Mark lead as converted
     */
    markConverted(id: string, tenantId: string, clientId: string): Promise<{
        leadSource: {
            tenantId: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        } | null;
        tags: ({
            tag: {
                tenantId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                color: string | null;
            };
        } & {
            id: string;
            tagId: string;
            leadId: string;
        })[];
        assignedTo: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
                avatar: string | null;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
        createdBy: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.LeadStatus;
        email: string | null;
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        location: string | null;
        companyName: string | null;
        jobTitle: string | null;
        website: string | null;
        temperature: import(".prisma/client").$Enums.LeadTemperature;
        potentialValue: Prisma.Decimal | null;
        leadSourceId: string | null;
        assignedToId: string | null;
        notes: string | null;
        convertedAt: Date | null;
        convertedToClientId: string | null;
        createdById: string | null;
    }>;
    /**
     * Get pipeline data (leads grouped by status)
     */
    getPipeline(tenantId: string, filters?: {
        assignedToId?: string;
        leadSourceId?: string;
        temperature?: LeadTemperature;
    }): Promise<{
        status: import(".prisma/client").$Enums.LeadStatus;
        count: number;
        totalValue: number;
        leads: ({
            leadSource: {
                tenantId: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            } | null;
            tags: ({
                tag: {
                    tenantId: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    color: string | null;
                };
            } & {
                id: string;
                tagId: string;
                leadId: string;
            })[];
            assignedTo: ({
                user: {
                    email: string;
                    id: string;
                    firstName: string;
                    lastName: string;
                    avatar: string | null;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
            createdBy: ({
                user: {
                    id: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            }) | null;
        } & {
            status: import(".prisma/client").$Enums.LeadStatus;
            email: string | null;
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            firstName: string;
            lastName: string;
            phone: string | null;
            location: string | null;
            companyName: string | null;
            jobTitle: string | null;
            website: string | null;
            temperature: import(".prisma/client").$Enums.LeadTemperature;
            potentialValue: Prisma.Decimal | null;
            leadSourceId: string | null;
            assignedToId: string | null;
            notes: string | null;
            convertedAt: Date | null;
            convertedToClientId: string | null;
            createdById: string | null;
        })[];
    }[]>;
    /**
     * Get lead statistics
     */
    getStatistics(tenantId: string, startDate?: Date, endDate?: Date): Promise<{
        total: number;
        byStatus: Record<import(".prisma/client").$Enums.LeadStatus, number>;
        byTemperature: Record<import(".prisma/client").$Enums.LeadTemperature, number>;
        bySource: {
            sourceId: string;
            sourceName: string;
            count: number;
        }[];
        totalValue: number;
        averageValue: number;
        conversionRate: number;
        newThisMonth: number;
        convertedThisMonth: number;
    }>;
    /**
     * Check if employee exists in tenant
     */
    employeeExists(employeeId: string, tenantId: string): Promise<boolean>;
    /**
     * Check if lead source exists in tenant
     */
    leadSourceExists(leadSourceId: string, tenantId: string): Promise<boolean>;
    /**
     * Check if tags exist in tenant
     */
    tagsExist(tagIds: string[], tenantId: string): Promise<boolean>;
}
export declare const leadsRepository: LeadsRepository;
//# sourceMappingURL=leads.repository.d.ts.map