import { Client, ClientType, ClientStatus, ClientLifecycleStage } from '@prisma/client';

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
    lifecycleStage?: ClientLifecycleStage;
    assignedOwner?: string | null;
    website?: string | null;
    noOfEmployees?: string | null;
    annualRevenue?: number | null;
    exchangeRate?: number | null;
    industry?: string | null;
    territory?: string | null;
    organizationAddress?: string | null;

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

    // 8️⃣ Sales account preferences
    preferredContactMethod?: string | null;
    bestTimeToContact?: string | null;

    // 9️⃣ Secondary Contact
    secondaryPhone?: string | null;

    // 🔟 Lead Tracking
    budgetRange?: string | null;
    urgencyLevel?: string | null;

    // 1️⃣1️⃣ Communication Preferences
    doNotContact?: boolean;
    nextFollowUp?: Date | string | null;
    language?: string | null;
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
    lifecycleStage: ClientLifecycleStage;
    assignedOwner: { id: string; firstName: string; lastName: string } | null;
    website: string | null;
    noOfEmployees: string | null;
    annualRevenue: number | null;
    exchangeRate: number | null;
    industry: string | null;
    territory: string | null;
    organizationAddress: string | null;

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

    // Sales account preferences
    preferredContactMethod: string | null;
    bestTimeToContact: string | null;

    // Secondary Contact
    secondaryPhone: string | null;

    // Extended
    budgetRange: string | null;
    urgencyLevel: string | null;
    doNotContact: boolean;
    nextFollowUp: Date | null;
    language: string | null;

    // Metadata
    contactsCount: number;
    projectsCount: number;
    invoicesCount: number;
    quotesCount: number;
    filesCount: number;
    createdAt: Date;
    updatedAt: Date;
}

type ClientWithRelations = Client & {
    assignedOwner?: { id: string; user: { firstName: string; lastName: string } } | null;
    _count?: { contacts: number; projects: number; invoices: number; quotes: number; files: number };
};

export const CLIENT_LEGACY_FIELD_NAMES = [
    'propertyType',
    'numberOfStories',
    'serviceType',
    'currentRoofMaterial',
    'roofAge',
    'insuranceCompanyName',
    'isInsuranceClaim',
    'isHomeowner',
    'isHOA',
    'hoaRestrictions',
    'spouseCoOwnerName',
    'roofSize',
    'roofPitch',
    'warrantyExpiration',
] as const;

export function stripLegacyClientFields<T extends object>(input: T): Omit<T, typeof CLIENT_LEGACY_FIELD_NAMES[number]> {
    const cleaned = { ...input } as Record<string, unknown>;
    for (const field of CLIENT_LEGACY_FIELD_NAMES) {
        delete cleaned[field];
    }
    return cleaned as Omit<T, typeof CLIENT_LEGACY_FIELD_NAMES[number]>;
}

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
        lifecycleStage: (c as any).lifecycleStage ?? 'NEW_CUSTOMER',
        assignedOwner: c.assignedOwner ? { id: c.assignedOwner.id, firstName: c.assignedOwner.user.firstName, lastName: c.assignedOwner.user.lastName } : null,
        website: (c as any).website ?? null,
        noOfEmployees: (c as any).noOfEmployees ?? null,
        annualRevenue: (c as any).annualRevenue ? Number((c as any).annualRevenue) : null,
        exchangeRate: (c as any).exchangeRate ?? null,
        industry: (c as any).industry ?? null,
        territory: (c as any).territory ?? null,
        organizationAddress: (c as any).organizationAddress ?? null,

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

        // Sales account preferences
        preferredContactMethod: c.preferredContactMethod ?? null,
        bestTimeToContact: c.bestTimeToContact ?? null,

        // Secondary Contact
        secondaryPhone: c.secondaryPhone ?? null,

        // Extended fields
        budgetRange: c.budgetRange ?? null,
        urgencyLevel: c.urgencyLevel ?? null,
        doNotContact: c.doNotContact ?? false,
        nextFollowUp: c.nextFollowUp ?? null,
        language: c.language ?? null,

        // Metadata
        contactsCount: c._count?.contacts || 0,
        projectsCount: c._count?.projects || 0,
        invoicesCount: c._count?.invoices || 0,
        quotesCount: c._count?.quotes || 0,
        filesCount: c._count?.files || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
