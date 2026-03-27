import { z } from "zod";
import {
  ProjectPrioritySchema,
  ProjectStatusSchema,
  ProjectTypeSchema,
  PropertyTypeSchema,
  SortOrderSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
} from "./enums";

const dateLike = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable();

export const ProjectIdParamsSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
});

export const CreateProjectSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    projectTitle: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    quoteId: z.string().uuid().optional().nullable(),
    leadId: z.string().uuid().optional().nullable(),
    projectType: ProjectTypeSchema.optional(),
    propertyType: PropertyTypeSchema.optional(),
    status: ProjectStatusSchema.optional(),
    priority: ProjectPrioritySchema.optional(),
    stageId: z.string().uuid().optional().nullable(),
    projectManagerId: z.string().optional().nullable(),
    salesRepId: z.string().optional().nullable(),
    contractValue: z.number().optional().nullable(),
    estimatedCost: z.number().optional().nullable(),
    budget: z.number().optional().nullable(),
    estimatedStartDate: dateLike,
    estimatedEndDate: dateLike,
    dueDate: dateLike,
    jobSiteAddress: z.string().optional().nullable(),
    jobSiteCity: z.string().optional().nullable(),
    jobSiteState: z.string().optional().nullable(),
    jobSiteZip: z.string().optional().nullable(),
    internalNotes: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional().nullable(),
  })
  .passthrough();

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const ProjectQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    search: z.string().optional(),
    status: ProjectStatusSchema.optional(),
    priority: ProjectPrioritySchema.optional(),
    stageId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    projectManagerId: z.string().optional(),
    sortBy: z.string().default("createdAt"),
    sortOrder: SortOrderSchema.default("desc"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .passthrough();

export const ProjectStatusUpdateSchema = z.object({
  status: ProjectStatusSchema,
});

export const ProjectStageUpdateSchema = z.object({
  stageId: z.string().uuid(),
  notes: z.string().optional(),
});

export const AssignProjectManagerSchema = z.object({
  projectManagerId: z.string().optional().nullable(),
});

export const CreateProjectTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.string().optional(),
  priority: TaskPrioritySchema.optional(),
  status: TaskStatusSchema.optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
  parentTaskId: z.string().uuid().optional(),
  isChecklist: z.boolean().optional(),
  checklistItems: z.unknown().optional(),
});

export type ProjectQueryDto = z.input<typeof ProjectQuerySchema>;
export type CreateProjectDto = z.input<typeof CreateProjectSchema>;
export type UpdateProjectDto = z.input<typeof UpdateProjectSchema>;
export type CreateProjectTaskDto = z.input<typeof CreateProjectTaskSchema>;
