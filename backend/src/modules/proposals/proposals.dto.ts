import { Proposal } from '@prisma/client';
import type { ProposalStatus } from '@contracts/enums';
import type {
    CreateProposalDto,
    UpdateProposalDto,
    ProposalQueryDto,
} from '@contracts/proposal';

export type {
    CreateProposalDto,
    UpdateProposalDto,
    ProposalQueryDto,
} from '@contracts/proposal';

// ============================================================================
// PROPOSALS DTOs — Stage 3: Business → Documents → Proposals
// ============================================================================

export interface ProposalResponseDto {
    id: string;
    proposalNumber: string;
    status: ProposalStatus;
    leadId: string;
    leadName: string;
    propertyAddress: string | null;
    quoteId: string;
    quoteNumber: string;
    quoteTotal: number;
    roofEstimateId: string | null;
    customMessageToClient: string | null;
    scopeOfWork: string | null;
    termsAndConditions: string | null;
    pdfUrl: string | null;
    pdfGeneratedAt: Date | null;
    publicToken: string | null;
    signedAt: Date | null;
    signedByName: string | null;
    createdBy: { id: string; firstName: string; lastName: string } | null;
    createdAt: Date;
    updatedAt: Date;
    sentAt: Date | null;
}

type ProposalWithRelations = Proposal & {
    lead?: { id: string; firstName: string; lastName: string; propertyAddress?: string | null } | null;
    quote?: { id: string; quoteNumber: string; total: any } | null;
    createdBy?: { id: string; user: { firstName: string; lastName: string } } | null;
};

export function toProposalResponseDto(p: ProposalWithRelations): ProposalResponseDto {
    return {
        id: p.id,
        proposalNumber: p.proposalNumber,
        status: p.status,
        leadId: p.leadId,
        leadName: p.lead
            ? `${p.lead.firstName} ${p.lead.lastName}`.trim()
            : 'Unknown',
        propertyAddress: p.lead?.propertyAddress || null,
        quoteId: p.quoteId,
        quoteNumber: p.quote?.quoteNumber || '',
        quoteTotal: p.quote ? Number(p.quote.total) : 0,
        roofEstimateId: p.roofEstimateId,
        customMessageToClient: p.customMessageToClient,
        scopeOfWork: p.scopeOfWork,
        termsAndConditions: p.termsAndConditions,
        pdfUrl: p.pdfUrl,
        pdfGeneratedAt: p.pdfGeneratedAt,
        publicToken: p.publicToken,
        signedAt: p.signedAt,
        signedByName: p.signedByName,
        createdBy: p.createdBy
            ? { id: p.createdBy.id, firstName: p.createdBy.user.firstName, lastName: p.createdBy.user.lastName }
            : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        sentAt: p.sentAt,
    };
}
