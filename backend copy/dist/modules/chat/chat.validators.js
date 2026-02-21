"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageIdSchema = exports.conversationIdSchema = exports.messageQuerySchema = exports.conversationQuerySchema = exports.sendMessageSchema = exports.createConversationSchema = void 0;
const zod_1 = require("zod");
exports.createConversationSchema = zod_1.z.object({
    body: zod_1.z.object({
        participantIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
        name: zod_1.z.string().max(255).optional().nullable(),
        isGroup: zod_1.z.boolean().default(false),
    }),
});
exports.sendMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1).max(5000),
        attachments: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.enum(['file', 'image']),
            url: zod_1.z.string().url(),
            name: zod_1.z.string().optional(),
        })).default([]),
    }),
});
exports.conversationQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    }),
});
exports.messageQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
        before: zod_1.z.string().datetime().optional(),
    }),
});
exports.conversationIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
exports.messageIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid(), messageId: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=chat.validators.js.map