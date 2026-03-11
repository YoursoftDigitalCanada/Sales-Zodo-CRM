import {
  CreateProposalSchema,
  ProposalIdParamsSchema,
  ProposalQuerySchema,
  UpdateProposalSchema,
} from '@contracts/proposal';

// ============================================================================
// PROPOSALS Validators — shared contracts
// ============================================================================

export const createProposalSchema = CreateProposalSchema;
export const updateProposalSchema = UpdateProposalSchema;
export const proposalQuerySchema = ProposalQuerySchema;
export const proposalIdParamSchema = ProposalIdParamsSchema;
