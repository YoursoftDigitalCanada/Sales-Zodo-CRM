import { z } from 'zod';

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(50),
    color: z
      .string()
      .regex(hexColorRegex, 'Color must be a valid hex color (e.g., #FF5733)')
      .optional()
      .nullable(),
  }),
});

export const updateTagSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    color: z
      .string()
      .regex(hexColorRegex, 'Color must be a valid hex color')
      .optional()
      .nullable(),
  }),
});

export const tagQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
    search: z.string().optional(),
  }),
});

export const tagIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid tag ID'),
  }),
});

export type CreateTagInput = z.infer<typeof createTagSchema>['body'];
export type UpdateTagInput = z.infer<typeof updateTagSchema>['body'];
export type TagQueryInput = z.infer<typeof tagQuerySchema>['query'];