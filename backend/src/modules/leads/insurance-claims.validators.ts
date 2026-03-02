import { z } from 'zod';

const claimFields = {
    claimNumber: z.string().max(100).optional(),
    insuranceEstimateACV: z.number().min(0).optional(),
    recoverableDepreciation: z.number().min(0).optional(),
    fullRCVAmount: z.number().min(0).optional(),
    deductibleAmount: z.number().min(0).optional(),
    supplementNeeded: z.boolean().optional(),
    supplementAmount: z.number().min(0).optional(),
    supplementStatus: z.string().max(50).optional(),
    mortgageCompanyName: z.string().max(200).optional(),
    mortgageCompanyAddress: z.string().max(500).optional(),
    mortgageLoanNumber: z.string().max(100).optional(),
    claimStatus: z.string().max(50).optional(),
    claimNotes: z.string().max(5000).optional(),
};

export const createInsuranceClaimSchema = z.object({
    body: z.object(claimFields),
    params: z.object({
        leadId: z.string().uuid(),
    }),
});

export const updateInsuranceClaimSchema = z.object({
    body: z.object(claimFields),
    params: z.object({
        leadId: z.string().uuid(),
        claimId: z.string().uuid(),
    }),
});

export const insuranceClaimIdSchema = z.object({
    params: z.object({
        leadId: z.string().uuid(),
        claimId: z.string().uuid(),
    }),
});

export const insuranceClaimListSchema = z.object({
    params: z.object({
        leadId: z.string().uuid(),
    }),
});
