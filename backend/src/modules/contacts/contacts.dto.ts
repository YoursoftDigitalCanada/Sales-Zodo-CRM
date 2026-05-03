import { Contact, ContactType } from '@prisma/client';

// ============================================================================
// CONTACTS DTOs - Matching Form Fields
// ============================================================================

export interface CreateContactDto {
    contactName: string;
    companyId?: string | null;
    dealId?: string | null;
    type?: ContactType;
    jobTitle?: string | null;
    department?: string | null;
    email: string;
    officePhone?: string | null;
    mobilePhone?: string | null;
    linkedInUrl?: string | null;
    isPrimaryContact?: boolean;
    firstName?: string | null;
    lastName?: string | null;
    relationshipStatus?: string | null;
    roleInBuyingProcess?: string | null;
    seniorityLevel?: string | null;
    buyingAuthorityScore?: string | null;
    secondaryEmail?: string | null;
    alternatePhone?: string | null;
    preferredContactMethod?: string | null;
    timeZone?: string | null;
    notes?: string | null;
    tags?: string[];
    assignedToId?: string | null;
    lastContactedAt?: string | Date | null;
    totalInteractions?: number;
    lastActivityType?: string | null;
}

export interface UpdateContactDto extends Partial<CreateContactDto> { }

export interface ContactQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
    type?: ContactType;
    isPrimaryContact?: boolean;
    sortBy?: 'contactName' | 'createdAt' | 'email';
    sortOrder?: 'asc' | 'desc';
}

export interface ContactResponseDto {
    id: string;
    contactName: string;
    firstName: string | null;
    lastName: string | null;
    company: { id: string; clientName: string } | null;
    type: ContactType;
    relationshipStatus: string | null;
    roleInBuyingProcess: string | null;
    seniorityLevel: string | null;
    buyingAuthorityScore: string | null;
    jobTitle: string | null;
    department: string | null;
    email: string;
    secondaryEmail: string | null;
    officePhone: string | null;
    mobilePhone: string | null;
    alternatePhone: string | null;
    linkedInUrl: string | null;
    preferredContactMethod: string | null;
    timeZone: string | null;
    notes: string | null;
    tags: string[];
    assignedTo: { id: string; user: { firstName: string; lastName: string; email: string } } | null;
    deals: Array<{ id: string; dealId: string; dealName: string; role: string | null; isPrimary: boolean }>;
    lastContactedAt: Date | null;
    totalInteractions: number;
    lastActivityType: string | null;
    isPrimaryContact: boolean;
    createdAt: Date;
    updatedAt: Date;
}

type ContactWithRelations = Contact & {
    company?: { id: string; clientName: string } | null;
    assignedTo?: { id: string; user: { firstName: string; lastName: string; email: string } } | null;
    deals?: Array<{ id: string; dealId: string; role: string | null; isPrimary: boolean; deal?: { id: string; name: string } | null }>;
};

export function toContactResponseDto(c: ContactWithRelations): ContactResponseDto {
    return {
        id: c.id,
        contactName: c.contactName,
        firstName: (c as any).firstName,
        lastName: (c as any).lastName,
        company: c.company ? { id: c.company.id, clientName: c.company.clientName } : null,
        type: c.type,
        relationshipStatus: (c as any).relationshipStatus,
        roleInBuyingProcess: (c as any).roleInBuyingProcess,
        seniorityLevel: (c as any).seniorityLevel,
        buyingAuthorityScore: (c as any).buyingAuthorityScore,
        jobTitle: c.jobTitle,
        department: c.department,
        email: c.email,
        secondaryEmail: (c as any).secondaryEmail,
        officePhone: c.officePhone,
        mobilePhone: c.mobilePhone,
        alternatePhone: (c as any).alternatePhone,
        linkedInUrl: c.linkedInUrl,
        preferredContactMethod: (c as any).preferredContactMethod,
        timeZone: (c as any).timeZone,
        notes: (c as any).notes,
        tags: (c as any).tags || [],
        assignedTo: c.assignedTo || null,
        deals: (c.deals || []).map((link) => ({
            id: link.id,
            dealId: link.dealId,
            dealName: link.deal?.name || '',
            role: link.role,
            isPrimary: link.isPrimary,
        })),
        lastContactedAt: (c as any).lastContactedAt,
        totalInteractions: (c as any).totalInteractions || 0,
        lastActivityType: (c as any).lastActivityType,
        isPrimaryContact: c.isPrimaryContact,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
