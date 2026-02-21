import { z } from 'zod';

export const permissionModuleSchema = z.object({
    params: z.object({
        module: z.string().min(1).max(100),
    }),
});

export const roleIdSchema = z.object({
    params: z.object({
        roleId: z.string().uuid(),
    }),
});

export const assignPermissionsSchema = z.object({
    params: z.object({
        roleId: z.string().uuid(),
    }),
    body: z.object({
        permissionIds: z.array(z.string().uuid()),
    }),
});
