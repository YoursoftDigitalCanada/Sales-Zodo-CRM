"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailSchema = exports.emailTemplateIdSchema = exports.emailTemplateQuerySchema = exports.updateEmailTemplateSchema = exports.createEmailTemplateSchema = void 0;
const zod_1 = require("zod");
exports.createEmailTemplateSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255),
        subject: zod_1.z.string().min(1).max(500),
        body: zod_1.z.string().min(1),
        type: zod_1.z.enum(['LEAD_WELCOME', 'CLIENT_WELCOME', 'INVOICE', 'REMINDER', 'NOTIFICATION', 'CUSTOM']).default('CUSTOM'),
        variables: zod_1.z.array(zod_1.z.string()).default([]),
        isActive: zod_1.z.boolean().default(true),
    }),
});
exports.updateEmailTemplateSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255).optional(),
        subject: zod_1.z.string().min(1).max(500).optional(),
        body: zod_1.z.string().min(1).optional(),
        type: zod_1.z.enum(['LEAD_WELCOME', 'CLIENT_WELCOME', 'INVOICE', 'REMINDER', 'NOTIFICATION', 'CUSTOM']).optional(),
        variables: zod_1.z.array(zod_1.z.string()).optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.emailTemplateQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        type: zod_1.z.enum(['LEAD_WELCOME', 'CLIENT_WELCOME', 'INVOICE', 'REMINDER', 'NOTIFICATION', 'CUSTOM']).optional(),
        isActive: zod_1.z.coerce.boolean().optional(),
        sortBy: zod_1.z.enum(['name', 'createdAt', 'type']).default('name'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
    }),
});
exports.emailTemplateIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
exports.sendEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        templateId: zod_1.z.string().uuid().optional(),
        to: zod_1.z.array(zod_1.z.string().email()).min(1),
        subject: zod_1.z.string().min(1).max(500),
        body: zod_1.z.string().min(1),
        variables: zod_1.z.record(zod_1.z.string()).optional(),
    }),
});
//# sourceMappingURL=emails.validators.js.map