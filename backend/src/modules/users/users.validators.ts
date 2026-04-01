import { z } from 'zod';

const baseUserFields = {
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(50).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  roleId: z.string().uuid().optional(),
};

export const createUserSchema = z.object({
  body: z.object({
    ...baseUserFields,
    password: z.string().min(8).max(128).optional(),
    sendInviteEmail: z.boolean().optional(),
  }),
});

export const inviteUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    firstName: z.string().max(100).optional().default(''),
    lastName: z.string().max(100).optional().default(''),
    phone: z.string().max(50).optional().nullable(),
    department: z.string().max(100).optional().nullable(),
    position: z.string().max(100).optional().nullable(),
    roleId: z.string().uuid(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(50).optional().nullable(),
    avatar: z.string().url().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
    department: z.string().max(100).optional().nullable(),
    position: z.string().max(100).optional().nullable(),
  }),
});

export const updateUserRoleSchema = z.object({
  body: z.object({
    roleId: z.string().uuid(),
  }),
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']),
  }),
});

export const userQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
    sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
