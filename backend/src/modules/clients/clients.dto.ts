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

    // 8️⃣ Property Information
    propertyType?: string | null;
    numberOfStories?: string | null;

    // 9️⃣ Service Details
    serviceType?: string | null;
    preferredContactMethod?: string | null;
    bestTimeToContact?: string | null;

    // 🔟 Roof Details
    currentRoofMaterial?: string | null;
    roofAge?: string | null;

    // 1️⃣1️⃣ Insurance Info
    insuranceCompanyName?: string | null;
    isInsuranceClaim?: string | null;

    // 1️⃣2️⃣ Ownership & HOA
    isHomeowner?: string | null;
    isHOA?: string | null;
    hoaRestrictions?: string | null;

    // 1️⃣3️⃣ Secondary Contact
    secondaryPhone?: string | null;
    spouseCoOwnerName?: string | null;

    // 1️⃣4️⃣ Extended Roof Details
    roofSize?: string | null;
    roofPitch?: string | null;

    // 1️⃣5️⃣ Lead Tracking
    budgetRange?: string | null;
    urgencyLevel?: string | null;

    // 1️⃣6️⃣ Warranty
    warrantyExpiration?: Date | string | null;

    // 1️⃣7️⃣ Communication Preferences
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

    // Property Information
    propertyType: string | null;
    numberOfStories: string | null;

    // Service Details
    serviceType: string | null;
    preferredContactMethod: string | null;
    bestTimeToContact: string | null;

    // Roof Details
    currentRoofMaterial: string | null;
    roofAge: string | null;

    // Insurance Info
    insuranceCompanyName: string | null;
    isInsuranceClaim: string | null;

    // Ownership & HOA
    isHomeowner: string | null;
    isHOA: string | null;
    hoaRestrictions: string | null;

    // Secondary Contact
    secondaryPhone: string | null;
    spouseCoOwnerName: string | null;

    // Extended
    roofSize: string | null;
    roofPitch: string | null;
    budgetRange: string | null;
    urgencyLevel: string | null;
    warrantyExpiration: Date | null;
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

        // Property Information
        propertyType: c.propertyType ?? null,
        numberOfStories: c.numberOfStories ?? null,

        // Service Details
        serviceType: c.serviceType ?? null,
        preferredContactMethod: c.preferredContactMethod ?? null,
        bestTimeToContact: c.bestTimeToContact ?? null,

        // Roof Details
        currentRoofMaterial: c.currentRoofMaterial ?? null,
        roofAge: c.roofAge ?? null,

        // Insurance Info
        insuranceCompanyName: c.insuranceCompanyName ?? null,
        isInsuranceClaim: c.isInsuranceClaim ?? null,

        // Ownership & HOA
        isHomeowner: c.isHomeowner ?? null,
        isHOA: c.isHOA ?? null,
        hoaRestrictions: c.hoaRestrictions ?? null,

        // Secondary Contact
        secondaryPhone: c.secondaryPhone ?? null,
        spouseCoOwnerName: c.spouseCoOwnerName ?? null,

        // Extended fields
        roofSize: c.roofSize ?? null,
        roofPitch: c.roofPitch ?? null,
        budgetRange: c.budgetRange ?? null,
        urgencyLevel: c.urgencyLevel ?? null,
        warrantyExpiration: c.warrantyExpiration ?? null,
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
