import { z } from 'zod';

export const createConversationSchema = z.object({
    body: z.object({
        participantIds: z.array(z.string().uuid()).min(1),
        name: z.string().max(255).optional().nullable(),
        isGroup: z.boolean().default(false),
    }),
});

export const sendMessageSchema = z.object({
    body: z.object({
        content: z.string().min(1).max(5000),
        attachments: z.array(z.object({
            type: z.enum(['file', 'image']),
            url: z.string().url(),
            name: z.string().optional(),
        })).default([]),
    }),
});

export const conversationQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
});

export const messageQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        before: z.string().datetime().optional(),
    }),
});

export const conversationIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

export const messageIdSchema = z.object({
    params: z.object({ id: z.string().uuid(), messageId: z.string().uuid() }),
});
