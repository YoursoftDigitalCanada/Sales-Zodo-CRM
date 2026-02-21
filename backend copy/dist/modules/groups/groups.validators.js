"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMembersSchema = exports.groupIdSchema = exports.groupQuerySchema = exports.updateGroupSchema = exports.createGroupSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// GROUPS - Create Group
// ============================================================================
exports.createGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        groupName: zod_1.z.string().min(1).max(100),
        description: zod_1.z.string().max(500).optional().nullable(),
        groupType: zod_1.z.enum(['DEFAULT', 'CUSTOM']).default('CUSTOM'),
        icon: zod_1.z.string().max(50).optional().nullable(),
        color: zod_1.z.string().max(20).optional().nullable(),
        autoUpdateMembers: zod_1.z.boolean().default(false),
    }),
});
exports.updateGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        groupName: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().max(500).optional().nullable(),
        groupType: zod_1.z.enum(['DEFAULT', 'CUSTOM']).optional(),
        icon: zod_1.z.string().max(50).optional().nullable(),
        color: zod_1.z.string().max(20).optional().nullable(),
        autoUpdateMembers: zod_1.z.boolean().optional(),
    }),
});
exports.groupQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        groupType: zod_1.z.enum(['DEFAULT', 'CUSTOM']).optional(),
        sortBy: zod_1.z.enum(['groupName', 'createdAt']).default('groupName'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
    }),
});
exports.groupIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
exports.addMembersSchema = zod_1.z.object({
    body: zod_1.z.object({
        clientIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    }),
});
//# sourceMappingURL=groups.validators.js.map