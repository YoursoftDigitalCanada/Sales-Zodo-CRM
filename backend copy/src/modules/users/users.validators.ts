import { z } from 'zod';

export const createUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8).max(128),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        phone: z.string().max(50).optional().nullable(),
        roleId: z.string().uuid().optional(),
        isActive: z.boolean().default(true),
    }),
});

export const updateUserSchema = z.object({
    body: z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        phone: z.string().max(50).optional().nullable(),
        avatar: z.string().url().optional().nullable(),
        roleId: z.string().uuid().optional().nullable(),
        isActive: z.boolean().optional(),
    }),
});

export const userQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        roleId: z.string().uuid().optional(),
        sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const userIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type UserQueryInput = z.infer<typeof userQuerySchema>['query'];
