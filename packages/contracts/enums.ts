import { z } from "zod";

function enumObject<const T extends readonly string[]>(values: T): Record<T[number], T[number]> {
  const out = {} as Record<T[number], T[number]>;
  for (const value of values) {
    (out as any)[value] = value;
  }
  return Object.freeze(out);
}

export const LeadStatusValues = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;
export const LeadStatus = enumObject(LeadStatusValues);
export const LeadStatusSchema = z.enum(LeadStatusValues);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadTemperatureValues = ["COLD", "WARM", "HOT"] as const;
export const LeadTemperature = enumObject(LeadTemperatureValues);
export const LeadTemperatureSchema = z.enum(LeadTemperatureValues);
export type LeadTemperature = z.infer<typeof LeadTemperatureSchema>;

export const InvoiceStatusValues = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
] as const;
export const InvoiceStatus = enumObject(InvoiceStatusValues);
export const InvoiceStatusSchema = z.enum(InvoiceStatusValues);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const ProposalStatusValues = [
  "DRAFT",
  "GENERATED",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
] as const;
export const ProposalStatus = enumObject(ProposalStatusValues);
export const ProposalStatusSchema = z.enum(ProposalStatusValues);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProjectStatusValues = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "SCHEDULED",
  "IN_PROGRESS",
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
  "WARRANTY_WORK",
] as const;
export const ProjectStatus = enumObject(ProjectStatusValues);
export const ProjectStatusSchema = z.enum(ProjectStatusValues);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectTypeValues = [
  "REPAIR",
  "REPLACEMENT",
  "NEW_CONSTRUCTION",
  "INSPECTION",
  "MAINTENANCE",
  "EMERGENCY",
  "INSURANCE_CLAIM",
  "COMMERCIAL",
  "GUTTER",
  "SIDING",
  "OTHER",
] as const;
export const ProjectType = enumObject(ProjectTypeValues);
export const ProjectTypeSchema = z.enum(ProjectTypeValues);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;

export const PropertyTypeValues = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "MULTI_FAMILY",
  "HOA",
  "GOVERNMENT",
  "INDUSTRIAL",
] as const;
export const PropertyType = enumObject(PropertyTypeValues);
export const PropertyTypeSchema = z.enum(PropertyTypeValues);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const ProjectPriorityValues = ["LOW", "NORMAL", "HIGH", "URGENT", "EMERGENCY"] as const;
export const ProjectPriority = enumObject(ProjectPriorityValues);
export const ProjectPrioritySchema = z.enum(ProjectPriorityValues);
export type ProjectPriority = z.infer<typeof ProjectPrioritySchema>;

export const TaskStatusValues = [
  "TODO",
  "PENDING",
  "IN_PROGRESS",
  "REVIEW",
  "COMPLETED",
  "DONE",
  "CANCELLED",
  "BLOCKED",
] as const;
export const TaskStatus = enumObject(TaskStatusValues);
export const TaskStatusSchema = z.enum(TaskStatusValues);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPriorityValues = ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"] as const;
export const TaskPriority = enumObject(TaskPriorityValues);
export const TaskPrioritySchema = z.enum(TaskPriorityValues);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const CurrencyValues = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "CNY"] as const;
export const Currency = enumObject(CurrencyValues);
export const CurrencySchema = z.enum(CurrencyValues);
export type Currency = z.infer<typeof CurrencySchema>;

export const SortOrderValues = ["asc", "desc"] as const;
export const SortOrder = enumObject(SortOrderValues);
export const SortOrderSchema = z.enum(SortOrderValues);
export type SortOrder = z.infer<typeof SortOrderSchema>;

export const PipelineEntityTypeValues = ["LEAD", "PROJECT"] as const;
export const PipelineEntityType = enumObject(PipelineEntityTypeValues);
export const PipelineEntityTypeSchema = z.enum(PipelineEntityTypeValues);
export type PipelineEntityType = z.infer<typeof PipelineEntityTypeSchema>;
