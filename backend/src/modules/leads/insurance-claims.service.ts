import { insuranceClaimsRepository } from './insurance-claims.repository';
import { CreateInsuranceClaimDto, UpdateInsuranceClaimDto, toInsuranceClaimResponseDto } from './insurance-claims.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';

export class InsuranceClaimsService {
    async create(leadId: string, tenantId: string, data: CreateInsuranceClaimDto, createdById?: string) {
        const claim = await insuranceClaimsRepository.create(leadId, tenantId, data, createdById);
        return toInsuranceClaimResponseDto(claim);
    }

    async getByLeadId(leadId: string, tenantId: string) {
        const claims = await insuranceClaimsRepository.findByLeadId(leadId, tenantId);
        return claims.map(toInsuranceClaimResponseDto);
    }

    async getById(claimId: string, tenantId: string) {
        const claim = await insuranceClaimsRepository.findById(claimId, tenantId);
        if (!claim) throw new NotFoundError('Insurance claim not found');
        return toInsuranceClaimResponseDto(claim);
    }

    async update(claimId: string, tenantId: string, data: UpdateInsuranceClaimDto) {
        const existing = await insuranceClaimsRepository.findById(claimId, tenantId);
        if (!existing) throw new NotFoundError('Insurance claim not found');
        const updated = await insuranceClaimsRepository.update(claimId, tenantId, data);
        return toInsuranceClaimResponseDto(updated);
    }

    async delete(claimId: string, tenantId: string) {
        const existing = await insuranceClaimsRepository.findById(claimId, tenantId);
        if (!existing) throw new NotFoundError('Insurance claim not found');
        await insuranceClaimsRepository.delete(claimId, tenantId);
    }
}

export const insuranceClaimsService = new InsuranceClaimsService();
