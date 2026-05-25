import { Contract, ContractStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// CONTRACTS DTOs — Matching Prisma Schema (Contract)
// ============================================================================

export interface CreateContractDto {
    contractNumber?: string;           // auto-generated if not provided
    title: string;
    description?: string | null;
    clientId: string;
    contactId?: string | null;
    quoteId?: string | null;
    projectId?: string | null;
    value: number;
    currency?: string;
    startDate: Date | string;
    endDate: Date | string;
    terms?: string | null;
    notes?: string | null;
}

export interface UpdateContractDto extends Partial<CreateContractDto> {
    status?: ContractStatus;
}

export interface ContractQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: ContractStatus;
    clientId?: string;
    sortBy?: 'contractNumber' | 'title' | 'startDate' | 'endDate' | 'value' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface ContractResponseDto {
    id: string;
    contractNumber: string;
    title: string;
    description: string | null;
    status: ContractStatus;
    client: { id: string; clientName: string } | null;
    contact: { id: string; contactName: string; email: string | null } | null;
    contactId: string | null;
    quoteId: string | null;
    projectId: string | null;
    value: number;
    currency: string;
    startDate: Date;
    endDate: Date;
    signedAt: Date | null;
    terms: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

type ContractWithRelations = Contract & {
    client?: { id: string; clientName: string } | null;
    contact?: { id: string; contactName: string; email: string | null } | null;
};

export function toContractResponseDto(c: ContractWithRelations): ContractResponseDto {
    return {
        id: c.id,
        contractNumber: c.contractNumber,
        title: c.title,
        description: c.description,
        status: c.status,
        client: c.client ? { id: c.client.id, clientName: c.client.clientName } : null,
        contact: c.contact ? { id: c.contact.id, contactName: c.contact.contactName, email: c.contact.email } : null,
        contactId: c.contactId,
        quoteId: c.quoteId,
        projectId: c.projectId,
        value: Number(c.value),
        currency: c.currency,
        startDate: c.startDate,
        endDate: c.endDate,
        signedAt: c.signedAt,
        terms: c.terms,
        notes: c.notes,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    };
}
