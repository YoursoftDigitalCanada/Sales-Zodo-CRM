import { z } from 'zod';

const attachmentSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['file', 'image']),
    url: z.string().min(1),
    name: z.string().max(255).optional(),
    size: z.string().max(50).optional(),
});

export const createConversationSchema = z.object({
    body: z.object({
        participantIds: z.array(z.string().uuid()).min(1),
        name: z.string().max(255).optional().nullable(),
        isGroup: z.boolean().default(false),
    }),
});

export const sendMessageSchema = z.object({
    body: z.object({
        content: z.string().trim().max(5000).optional().default(''),
        attachments: z.array(attachmentSchema).default([]),
    }).superRefine((body, ctx) => {
        if (!body.content.trim() && body.attachments.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Message content or at least one attachment is required',
                path: ['content'],
            });
        }
    }),
});

export const updateMessageSchema = z.object({
    body: z.object({
        content: z.string().trim().min(1).max(5000),
    }),
});

export const conversationSettingsSchema = z.object({
    body: z.object({
        isPinned: z.boolean().optional(),
        isMuted: z.boolean().optional(),
        isArchived: z.boolean().optional(),
    }).refine((value) => Object.values(value).some((entry) => entry !== undefined), {
        message: 'At least one chat setting must be provided',
    }),
});

const booleanQueryValue = z.union([z.boolean(), z.string()]).optional().transform((value) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') {
            return true;
        }
        if (normalized === 'false' || normalized === '0' || normalized === '') {
            return false;
        }
    }

    return false;
});

export const conversationQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        archived: booleanQueryValue.default(false),
    }),
});

export const messageQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(200).default(100),
        before: z.string().datetime().optional(),
    }),
});

export const conversationIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

export const messageIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
        messageId: z.string().uuid(),
    }),
});
