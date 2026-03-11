import { z } from "zod";
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  LeadQuerySchema,
  LeadPipelineQuerySchema,
  LeadIdParamsSchema,
  ConvertLeadSchema,
  BulkAssignLeadsSchema,
  BulkUpdateLeadStatusSchema,
} from "@contracts/lead";

export const createLeadSchema = z.object({
  body: CreateLeadSchema,
});

export const updateLeadSchema = z.object({
  body: UpdateLeadSchema,
});

export const leadQuerySchema = z.object({
  query: LeadQuerySchema,
});

export const leadIdSchema = z.object({
  params: LeadIdParamsSchema,
});

export const convertLeadSchema = z.object({
  body: ConvertLeadSchema,
});

export const bulkAssignSchema = z.object({
  body: BulkAssignLeadsSchema,
});

export const bulkStatusSchema = z.object({
  body: BulkUpdateLeadStatusSchema,
});

export const pipelineQuerySchema = z.object({
  query: LeadPipelineQuerySchema,
});

export const setEstimationMethodSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    estimationMethod: z.enum(["PHYSICAL_INSPECTION", "AI_ESTIMATION", "BOTH"]),
  }),
});

