"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.folderIdSchema = exports.folderQuerySchema = exports.updateFolderSchema = exports.createFolderSchema = void 0;
const zod_1 = require("zod");
exports.createFolderSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255),
        parentId: zod_1.z.string().uuid().optional().nullable(),
        description: zod_1.z.string().max(500).optional().nullable(),
    }),
});
exports.updateFolderSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255).optional(),
        parentId: zod_1.z.string().uuid().optional().nullable(),
        description: zod_1.z.string().max(500).optional().nullable(),
    }),
});
exports.folderQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
        parentId: zod_1.z.string().uuid().optional().nullable(),
        search: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['name', 'createdAt']).default('name'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
    }),
});
exports.folderIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=folders.validators.js.map