import { z } from 'zod';
import { NotificationType } from '@prisma/client';

export const notificationQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    isRead: z
      .string()
      .optional()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
    type: z.nativeEnum(NotificationType).optional(),
  }),
});

export const markReadSchema = z.object({
  body: z.object({
    notificationIds: z.array(z.string().uuid()).optional(),
    ids: z.array(z.string().uuid()).optional(),
  }).refine((body) => {
    const ids = body.notificationIds || body.ids || [];
    return ids.length > 0;
  }, {
    message: 'At least one notification ID required',
    path: ['notificationIds'],
  }),
});

export const notificationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID'),
  }),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>['query'];
export type MarkReadInput = z.infer<typeof markReadSchema>['body'];
