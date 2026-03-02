import { Decimal } from '@prisma/client/runtime/library';

// ── Create DTO ────────────────────────────────────────────────────
export interface CreateInsuranceClaimDto {
    claimNumber?: string;
    insuranceEstimateACV?: number;
    recoverableDepreciation?: number;
    fullRCVAmount?: number;
    deductibleAmount?: number;
    supplementNeeded?: boolean;
    supplementAmount?: number;
    supplementStatus?: string;
    mortgageCompanyName?: string;
    mortgageCompanyAddress?: string;
    mortgageLoanNumber?: string;
    claimStatus?: string;
    claimNotes?: string;
}

// ── Update DTO ────────────────────────────────────────────────────
export type UpdateInsuranceClaimDto = Partial<CreateInsuranceClaimDto>;

// ── Response DTO ──────────────────────────────────────────────────
export interface InsuranceClaimResponseDto {
    id: string;
    leadId: string;
    tenantId: string;
    claimNumber: string | null;
    insuranceEstimateACV: number | null;
    recoverableDepreciation: number | null;
    fullRCVAmount: number | null;
    deductibleAmount: number | null;
    supplementNeeded: boolean | null;
    supplementAmount: number | null;
    supplementStatus: string | null;
    mortgageCompanyName: string | null;
    mortgageCompanyAddress: string | null;
    mortgageLoanNumber: string | null;
    claimStatus: string | null;
    claimNotes: string | null;
    createdById: string | null;
    createdAt: string;
    updatedAt: string;
}

// ── Mapper ────────────────────────────────────────────────────────
const decimalToNum = (v: Decimal | null | undefined): number | null =>
    v != null ? Number(v) : null;

export function toInsuranceClaimResponseDto(c: any): InsuranceClaimResponseDto {
    return {
        id: c.id,
        leadId: c.leadId,
        tenantId: c.tenantId,
        claimNumber: c.claimNumber ?? null,
        insuranceEstimateACV: decimalToNum(c.insuranceEstimateACV),
        recoverableDepreciation: decimalToNum(c.recoverableDepreciation),
        fullRCVAmount: decimalToNum(c.fullRCVAmount),
        deductibleAmount: decimalToNum(c.deductibleAmount),
        supplementNeeded: c.supplementNeeded ?? null,
        supplementAmount: decimalToNum(c.supplementAmount),
        supplementStatus: c.supplementStatus ?? null,
        mortgageCompanyName: c.mortgageCompanyName ?? null,
        mortgageCompanyAddress: c.mortgageCompanyAddress ?? null,
        mortgageLoanNumber: c.mortgageLoanNumber ?? null,
        claimStatus: c.claimStatus ?? null,
        claimNotes: c.claimNotes ?? null,
        createdById: c.createdById ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    };
}
