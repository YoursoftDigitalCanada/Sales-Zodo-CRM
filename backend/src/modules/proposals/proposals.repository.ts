import { PrismaClient, Prisma } from '@prisma/client';
import { CreateProposalDto, UpdateProposalDto, ProposalQueryDto } from './proposals.dto';

const prisma = new PrismaClient();

// Standard include for Proposal queries (resolves lead, quote, createdBy)
const PROPOSAL_INCLUDE = {
    lead: { select: { id: true, firstName: true, lastName: true, propertyAddress: true } },
    quote: { select: { id: true, quoteNumber: true, total: true } },
    createdBy: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.ProposalInclude;

class ProposalsRepository {
    async create(tenantId: string, data: CreateProposalDto & { proposalNumber: string }, createdById?: string) {
        return prisma.proposal.create({
            data: {
                tenantId,
                proposalNumber: data.proposalNumber,
                leadId: data.leadId,
                quoteId: data.quoteId,
                roofEstimateId: data.roofEstimateId || null,
                customMessageToClient: data.customMessageToClient || null,
                scopeOfWork: data.scopeOfWork || null,
                termsAndConditions: data.termsAndConditions || null,
                createdById: createdById || null,
            },
            include: PROPOSAL_INCLUDE,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.proposal.findFirst({
            where: { id, tenantId },
            include: PROPOSAL_INCLUDE,
        });
    }

    async findMany(tenantId: string, query: ProposalQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.ProposalWhereInput = { tenantId };

        if (query.status) where.status = query.status;
        if (query.leadId) where.leadId = query.leadId;
        if (query.quoteId) where.quoteId = query.quoteId;
        if (query.search) {
            where.OR = [
                { proposalNumber: { contains: query.search, mode: 'insensitive' } },
                { lead: { firstName: { contains: query.search, mode: 'insensitive' } } },
                { lead: { lastName: { contains: query.search, mode: 'insensitive' } } },
            ];
        }

        const orderBy: Prisma.ProposalOrderByWithRelationInput = {
            [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        };

        const [data, total] = await Promise.all([
            prisma.proposal.findMany({
                where,
                include: PROPOSAL_INCLUDE,
                orderBy,
                skip,
                take: limit,
            }),
            prisma.proposal.count({ where }),
        ]);

        return { data, total };
    }

    async update(id: string, tenantId: string, data: Partial<UpdateProposalDto> & Record<string, any>) {
        return prisma.proposal.update({
            where: { id },
            data: { ...data },
            include: PROPOSAL_INCLUDE,
        });
    }

    async delete(id: string, tenantId: string) {
        return prisma.proposal.deleteMany({
            where: { id, tenantId },
        });
    }

    async count(tenantId: string) {
        return prisma.proposal.count({ where: { tenantId } });
    }

    async findByPublicToken(token: string) {
        return prisma.proposal.findFirst({
            where: { publicToken: token },
            include: {
                ...PROPOSAL_INCLUDE,
                quote: {
                    select: {
                        id: true,
                        quoteNumber: true,
                        total: true,
                        subtotal: true,
                        taxAmount: true,
                        discountAmount: true,
                        currency: true,
                        paymentScheduleType: true,
                        warrantySelected: true,
                        notes: true,
                        terms: true,
                        items: { orderBy: { sortOrder: 'asc' } },
                    },
                },
                roofEstimate: {
                    select: {
                        id: true,
                        address: true,
                        roofAreaSqft: true,
                        pitch: true,
                        roofType: true,
                        stories: true,
                        ridgeLengthFt: true,
                        valleyLengthFt: true,
                        eaveLengthFt: true,
                        totalEstimate: true,
                        pdfUrl: true,
                    },
                },
            },
        });
    }
}

export const proposalsRepository = new ProposalsRepository();
