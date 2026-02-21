import { Contact, ContactType } from '@prisma/client';

// ============================================================================
// CONTACTS DTOs - Matching Form Fields
// ============================================================================

export interface CreateContactDto {
    contactName: string;
    companyId?: string | null;
    type?: ContactType;
    jobTitle?: string | null;
    department?: string | null;
    email: string;
    officePhone?: string | null;
    mobilePhone?: string | null;
    linkedInUrl?: string | null;
    isPrimaryContact?: boolean;
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
    company: { id: string; clientName: string } | null;
    type: ContactType;
    jobTitle: string | null;
    department: string | null;
    email: string;
    officePhone: string | null;
    mobilePhone: string | null;
    linkedInUrl: string | null;
    isPrimaryContact: boolean;
    createdAt: Date;
    updatedAt: Date;
}

type ContactWithRelations = Contact & {
    company?: { id: string; clientName: string } | null;
};

export function toContactResponseDto(c: ContactWithRelations): ContactResponseDto {
    return {
        id: c.id,
        contactName: c.contactName,
        company: c.company ? { id: c.company.id, clientName: c.company.clientName } : null,
        type: c.type,
        jobTitle: c.jobTitle,
        department: c.department,
        email: c.email,
        officePhone: c.officePhone,
        mobilePhone: c.mobilePhone,
        linkedInUrl: c.linkedInUrl,
        isPrimaryContact: c.isPrimaryContact,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
