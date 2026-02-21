import { Client, ClientType, ClientStatus } from '@prisma/client';
export interface CreateClientDto {
    clientLogo?: string | null;
    clientName: string;
    companyName?: string | null;
    clientType?: ClientType;
    primaryEmail: string;
    primaryPhone: string;
    status?: ClientStatus;
    assignedOwner?: string | null;
    gstHstNumber?: string | null;
    pstQstNumber?: string | null;
    businessStructure?: string | null;
    corpRegistrationNumber?: string | null;
    streetAddress?: string | null;
    suite?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    internalNotes?: string | null;
    contactName?: string | null;
    position?: string | null;
    directPhone?: string | null;
    creditLimit?: number | null;
    paymentTerms?: string | null;
    currency?: string;
    leadSource?: string | null;
    clientCategory?: string | null;
    tags?: string[];
}
export interface UpdateClientDto extends Partial<CreateClientDto> {
}
export interface ClientQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    clientType?: ClientType;
    status?: ClientStatus;
    assignedOwner?: string;
    clientCategory?: string;
    sortBy?: 'clientName' | 'createdAt' | 'primaryEmail';
    sortOrder?: 'asc' | 'desc';
}
export interface ClientResponseDto {
    id: string;
    clientLogo: string | null;
    clientName: string;
    companyName: string | null;
    clientType: ClientType;
    primaryEmail: string;
    primaryPhone: string;
    status: ClientStatus;
    assignedOwner: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    gstHstNumber: string | null;
    pstQstNumber: string | null;
    businessStructure: string | null;
    corpRegistrationNumber: string | null;
    streetAddress: string | null;
    suite: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;
    internalNotes: string | null;
    contactName: string | null;
    position: string | null;
    directPhone: string | null;
    creditLimit: number | null;
    paymentTerms: string | null;
    currency: string;
    leadSource: string | null;
    clientCategory: string | null;
    tags: string[];
    contactsCount: number;
    projectsCount: number;
    createdAt: Date;
    updatedAt: Date;
}
type ClientWithRelations = Client & {
    assignedOwner?: {
        id: string;
        user: {
            firstName: string;
            lastName: string;
        };
    } | null;
    _count?: {
        contacts: number;
        projects: number;
    };
};
export declare function toClientResponseDto(c: ClientWithRelations): ClientResponseDto;
export {};
//# sourceMappingURL=clients.dto.d.ts.map