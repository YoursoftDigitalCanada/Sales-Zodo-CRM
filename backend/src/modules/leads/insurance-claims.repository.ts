import { prisma } from '../../config/database';
import { CreateInsuranceClaimDto, UpdateInsuranceClaimDto } from './insurance-claims.dto';

export class InsuranceClaimsRepository {
    async create(leadId: string, tenantId: string, data: CreateInsuranceClaimDto, createdById?: string) {
        return prisma.leadInsuranceClaim.create({
            data: {
                leadId,
                tenantId,
                createdById: createdById || null,
                ...data,
            },
        });
    }

    async findByLeadId(leadId: string, tenantId: string) {
        return prisma.leadInsuranceClaim.findMany({
            where: { leadId, tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(claimId: string, tenantId: string) {
        return prisma.leadInsuranceClaim.findFirst({
            where: { id: claimId, tenantId },
        });
    }

    async update(claimId: string, tenantId: string, data: UpdateInsuranceClaimDto) {
        const existing = await prisma.leadInsuranceClaim.findFirst({
            where: { id: claimId, tenantId },
            select: { id: true },
        });
        if (!existing) throw new Error('Insurance claim not found or access denied');

        return prisma.leadInsuranceClaim.update({
            where: { id_tenantId: { id: claimId, tenantId } },
            data,
        });
    }

    async delete(claimId: string, tenantId: string) {
        const existing = await prisma.leadInsuranceClaim.findFirst({
            where: { id: claimId, tenantId },
            select: { id: true },
        });
        if (!existing) throw new Error('Insurance claim not found or access denied');

        return prisma.leadInsuranceClaim.delete({
            where: { id_tenantId: { id: claimId, tenantId } },
        });
    }
}

export const insuranceClaimsRepository = new InsuranceClaimsRepository();
