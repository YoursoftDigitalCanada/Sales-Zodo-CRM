"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileIdSchema = exports.fileQuerySchema = exports.updateFileSchema = exports.uploadFileSchema = void 0;
const zod_1 = require("zod");
exports.uploadFileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255),
        folderId: zod_1.z.string().uuid().optional().nullable(),
        description: zod_1.z.string().max(500).optional().nullable(),
        clientId: zod_1.z.string().uuid().optional().nullable(),
        projectId: zod_1.z.string().uuid().optional().nullable(),
    }),
});
exports.updateFileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255).optional(),
        folderId: zod_1.z.string().uuid().optional().nullable(),
        description: zod_1.z.string().max(500).optional().nullable(),
    }),
});
exports.fileQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        folderId: zod_1.z.string().uuid().optional().nullable(),
        clientId: zod_1.z.string().uuid().optional(),
        projectId: zod_1.z.string().uuid().optional(),
        mimeType: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['name', 'createdAt', 'size']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.fileIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=files.validators.js.map