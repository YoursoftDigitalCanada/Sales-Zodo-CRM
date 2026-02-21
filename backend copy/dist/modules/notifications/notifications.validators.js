"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationIdSchema = exports.markReadSchema = exports.notificationQuerySchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.notificationQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
        limit: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
        isRead: zod_1.z
            .string()
            .optional()
            .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
        type: zod_1.z.nativeEnum(client_1.NotificationType).optional(),
    }),
});
exports.markReadSchema = zod_1.z.object({
    body: zod_1.z.object({
        notificationIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'At least one notification ID required'),
    }),
});
exports.notificationIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid notification ID'),
    }),
});
//# sourceMappingURL=notifications.validators.js.map