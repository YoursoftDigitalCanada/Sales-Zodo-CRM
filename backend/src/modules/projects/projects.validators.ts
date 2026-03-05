import { z } from 'zod';

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
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    projectTitle: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    quoteId: z.string().uuid().optional().nullable(),
    leadId: z.string().uuid().optional().nullable(),
    projectType: z.string().optional(),
    propertyType: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
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
  }).passthrough(),
}).passthrough();

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    projectTitle: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    quoteId: z.string().uuid().optional().nullable(),
    leadId: z.string().uuid().optional().nullable(),
    projectType: z.string().optional(),
    propertyType: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
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
  }).passthrough(),
}).passthrough();

export const projectQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    search: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    stageId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    projectManagerId: z.string().optional(),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).passthrough(),
}).passthrough();

export const stageUpdateSchema = z.object({
  body: z.object({
    stageId: z.string().uuid(),
    notes: z.string().optional(),
  }),
}).passthrough();

export const statusUpdateSchema = z.object({
  body: z.object({
    status: z.string().min(1),
  }),
}).passthrough();

export const assignManagerSchema = z.object({
  body: z.object({
    projectManagerId: z.string().optional().nullable(),
  }),
}).passthrough();

export const genericBodySchema = z.object({
  body: z.object({}).passthrough(),
}).passthrough();
