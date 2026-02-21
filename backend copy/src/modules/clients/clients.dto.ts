import { Client, ClientType, ClientStatus } from '@prisma/client';

// ============================================================================
// CLIENTS DTOs - Matching Form Fields
// ============================================================================

export interface CreateClientDto {
    // 1️⃣ Basic Information
    clientLogo?: string | null;
    clientName: string;
    companyName?: string | null;
    clientType?: ClientType;
    primaryEmail: string;
    primaryPhone: string;
    status?: ClientStatus;
    assignedOwner?: string | null;

    // 2️⃣ Business & Tax Details
    gstHstNumber?: string | null;
    pstQstNumber?: string | null;
    businessStructure?: string | null;
    corpRegistrationNumber?: string | null;

    // 3️⃣ Billing Address
    streetAddress?: string | null;
    suite?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;

    // 4️⃣ Internal Notes
    internalNotes?: string | null;

    // 5️⃣ Primary Contact
    contactName?: string | null;
    position?: string | null;
    directPhone?: string | null;

    // 6️⃣ Financial Settings
    creditLimit?: number | null;
    paymentTerms?: string | null;
    currency?: string;

    // 7️⃣ Categorization
    leadSource?: string | null;
    clientCategory?: string | null;
    tags?: string[];
}

export interface UpdateClientDto extends Partial<CreateClientDto> { }

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
    // Basic Information
    clientLogo: string | null;
    clientName: string;
    companyName: string | null;
    clientType: ClientType;
    primaryEmail: string;
    primaryPhone: string;
    status: ClientStatus;
    assignedOwner: { id: string; firstName: string; lastName: string } | null;

    // Business & Tax Details
    gstHstNumber: string | null;
    pstQstNumber: string | null;
    businessStructure: string | null;
    corpRegistrationNumber: string | null;

    // Billing Address
    streetAddress: string | null;
    suite: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;

    // Internal Notes
    internalNotes: string | null;

    // Primary Contact
    contactName: string | null;
    position: string | null;
    directPhone: string | null;

    // Financial Settings
    creditLimit: number | null;
    paymentTerms: string | null;
    currency: string;

    // Categorization
    leadSource: string | null;
    clientCategory: string | null;
    tags: string[];

    // Metadata
    contactsCount: number;
    projectsCount: number;
    createdAt: Date;
    updatedAt: Date;
}

type ClientWithRelations = Client & {
    assignedOwner?: { id: string; user: { firstName: string; lastName: string } } | null;
    _count?: { contacts: number; projects: number };
};

export function toClientResponseDto(c: ClientWithRelations): ClientResponseDto {
    return {
        id: c.id,
        // Basic Information
        clientLogo: c.clientLogo,
        clientName: c.clientName,
        companyName: c.companyName,
        clientType: c.clientType,
        primaryEmail: c.primaryEmail,
        primaryPhone: c.primaryPhone,
        status: c.status,
        assignedOwner: c.assignedOwner ? { id: c.assignedOwner.id, firstName: c.assignedOwner.user.firstName, lastName: c.assignedOwner.user.lastName } : null,

        // Business & Tax Details
        gstHstNumber: c.gstHstNumber,
        pstQstNumber: c.pstQstNumber,
        businessStructure: c.businessStructure,
        corpRegistrationNumber: c.corpRegistrationNumber,

        // Billing Address
        streetAddress: c.streetAddress,
        suite: c.suite,
        city: c.city,
        province: c.province,
        postalCode: c.postalCode,
        country: c.country,

        // Internal Notes
        internalNotes: c.internalNotes,

        // Primary Contact
        contactName: c.contactName,
        position: c.position,
        directPhone: c.directPhone,

        // Financial Settings
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        paymentTerms: c.paymentTerms,
        currency: c.currency,

        // Categorization
        leadSource: c.leadSource,
        clientCategory: c.clientCategory,
        tags: (c.tags as string[]) || [],

        // Metadata
        contactsCount: c._count?.contacts || 0,
        projectsCount: c._count?.projects || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
