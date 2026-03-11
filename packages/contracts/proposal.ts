import { z } from "zod";
import { ProposalStatusSchema, SortOrderSchema } from "./enums";

export const ProposalIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CreateProposalSchema = z.object({
  leadId: z.string().uuid(),
  quoteId: z.string().uuid(),
  roofEstimateId: z.string().uuid().optional().nullable(),
  customMessageToClient: z.string().max(5000).optional().nullable(),
  scopeOfWork: z.string().max(10000).optional().nullable(),
  termsAndConditions: z.string().max(10000).optional().nullable(),
});

export const UpdateProposalSchema = z.object({
  status: ProposalStatusSchema.optional(),
  customMessageToClient: z.string().max(5000).optional().nullable(),
  coverPageHtml: z.string().max(50000).optional().nullable(),
  scopeOfWork: z.string().max(10000).optional().nullable(),
  termsAndConditions: z.string().max(10000).optional().nullable(),
  pdfUrl: z.string().max(500).optional().nullable(),
  pdfGeneratedAt: z.coerce.date().optional().nullable(),
  signedAt: z.coerce.date().optional().nullable(),
  signedByName: z.string().max(255).optional().nullable(),
  signatureData: z.string().optional().nullable(),
  sentAt: z.coerce.date().optional().nullable(),
});

export const ProposalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: ProposalStatusSchema.optional(),
  leadId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  sortBy: z.enum(["proposalNumber", "createdAt", "status"]).default("createdAt"),
  sortOrder: SortOrderSchema.default("desc"),
});

export type CreateProposalDto = z.input<typeof CreateProposalSchema>;
export type UpdateProposalDto = z.input<typeof UpdateProposalSchema>;
export type ProposalQueryDto = z.input<typeof ProposalQuerySchema>;
