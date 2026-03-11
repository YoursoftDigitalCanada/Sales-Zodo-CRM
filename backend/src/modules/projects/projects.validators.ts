import { z } from 'zod';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectQuerySchema,
  ProjectStageUpdateSchema,
  ProjectStatusUpdateSchema,
  AssignProjectManagerSchema,
} from '@contracts/project';

const dateLike = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable();

export const projectIdSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid project ID') }),
}).passthrough();

export const quoteIdSchema = z.object({
  params: z.object({ quoteId: z.string().uuid('Invalid quote ID') }),
}).passthrough();

export const nestedTaskIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    taskId: z.string().uuid('Invalid task ID'),
  }),
}).passthrough();

export const nestedMaterialIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    materialId: z.string().uuid('Invalid material ID'),
  }),
}).passthrough();

export const nestedLaborIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    laborId: z.string().uuid('Invalid labor ID'),
  }),
}).passthrough();

export const nestedExpenseIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    expenseId: z.string().uuid('Invalid expense ID'),
  }),
}).passthrough();

export const nestedAssignmentIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    assignmentId: z.string().uuid('Invalid assignment ID'),
  }),
}).passthrough();

export const nestedDocIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    docId: z.string().uuid('Invalid document ID'),
  }),
}).passthrough();

export const nestedPhotoIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    photoId: z.string().uuid('Invalid photo ID'),
  }),
}).passthrough();

export const nestedNoteIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    noteId: z.string().uuid('Invalid note ID'),
  }),
}).passthrough();

export const nestedInspectionIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    inspId: z.string().uuid('Invalid inspection ID'),
  }),
}).passthrough();

export const nestedChangeOrderIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    coId: z.string().uuid('Invalid change order ID'),
  }),
}).passthrough();

export const createProjectSchema = z.object({
  body: CreateProjectSchema,
}).passthrough();

export const updateProjectSchema = z.object({
  body: UpdateProjectSchema,
}).passthrough();

export const projectQuerySchema = z.object({
  query: ProjectQuerySchema,
}).passthrough();

export const stageUpdateSchema = z.object({
  body: ProjectStageUpdateSchema,
}).passthrough();

export const statusUpdateSchema = z.object({
  body: ProjectStatusUpdateSchema,
}).passthrough();

export const assignManagerSchema = z.object({
  body: AssignProjectManagerSchema,
}).passthrough();

export const genericBodySchema = z.object({
  body: z.object({}).passthrough(),
}).passthrough();
