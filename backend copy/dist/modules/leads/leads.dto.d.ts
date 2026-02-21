import { LeadStatus, LeadTemperature } from '@prisma/client';
export interface CreateLeadDto {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    location?: string;
    companyName?: string;
    jobTitle?: string;
    website?: string;
    status?: LeadStatus;
    temperature?: LeadTemperature;
    potentialValue?: number;
    leadSourceId?: string;
    assignedToId?: string;
    notes?: string;
    tagIds?: string[];
}
export interface UpdateLeadDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    location?: string;
    companyName?: string;
    jobTitle?: string;
    website?: string;
    status?: LeadStatus;
    temperature?: LeadTemperature;
    potentialValue?: number;
    leadSourceId?: string;
    assignedToId?: string;
    notes?: string;
    tagIds?: string[];
}
export interface LeadQueryDto {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    status?: LeadStatus;
    temperature?: LeadTemperature;
    leadSourceId?: string;
    assignedToId?: string;
    startDate?: Date;
    endDate?: Date;
    minValue?: number;
    maxValue?: number;
}
export interface ConvertLeadDto {
    clientType: 'INDIVIDUAL' | 'COMPANY';
    createContact?: boolean;
}
export interface BulkAssignLeadsDto {
    leadIds: string[];
    assignedToId: string;
}
export interface BulkUpdateStatusDto {
    leadIds: string[];
    status: LeadStatus;
}
export interface LeadResponseDto {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
    location?: string;
    companyName?: string;
    jobTitle?: string;
    website?: string;
    status: LeadStatus;
    temperature: LeadTemperature;
    potentialValue?: number;
    notes?: string;
    leadSource?: {
        id: string;
        name: string;
    };
    assignedTo?: {
        id: string;
        userId: string;
        user: {
            firstName: string;
            lastName: string;
            email: string;
        };
    };
    tags: Array<{
        id: string;
        name: string;
        color?: string;
    }>;
    createdBy?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
        };
    };
    createdAt: Date;
    updatedAt: Date;
    convertedAt?: Date;
}
export interface LeadListResponseDto {
    data: LeadResponseDto[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export interface LeadPipelineDto {
    status: LeadStatus;
    count: number;
    totalValue: number;
    leads: LeadResponseDto[];
}
export interface LeadStatisticsDto {
    total: number;
    byStatus: Record<LeadStatus, number>;
    byTemperature: Record<LeadTemperature, number>;
    bySource: Array<{
        sourceId: string;
        sourceName: string;
        count: number;
    }>;
    totalValue: number;
    averageValue: number;
    conversionRate: number;
    newThisMonth: number;
    convertedThisMonth: number;
}
export declare function toLeadResponseDto(lead: any): LeadResponseDto;
//# sourceMappingURL=leads.dto.d.ts.map