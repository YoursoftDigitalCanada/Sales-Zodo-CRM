"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseIdSchema = exports.expenseQuerySchema = exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
exports.createExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        category: zod_1.z.string().min(1).max(100),
        description: zod_1.z.string().min(1).max(500),
        amount: zod_1.z.number().min(0.01),
        currency: zod_1.z.string().length(3).default('USD'),
        expenseDate: zod_1.z.string().datetime(),
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED']).default('PENDING'),
        receipt: zod_1.z.string().url().optional().nullable(),
        projectId: zod_1.z.string().uuid().optional().nullable(),
        clientId: zod_1.z.string().uuid().optional().nullable(),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.updateExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        category: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().min(1).max(500).optional(),
        amount: zod_1.z.number().min(0.01).optional(),
        currency: zod_1.z.string().length(3).optional(),
        expenseDate: zod_1.z.string().datetime().optional(),
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED']).optional(),
        receipt: zod_1.z.string().url().optional().nullable(),
        projectId: zod_1.z.string().uuid().optional().nullable(),
        clientId: zod_1.z.string().uuid().optional().nullable(),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.expenseQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED']).optional(),
        category: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['expenseDate', 'amount', 'category', 'status']).default('expenseDate'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.expenseIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=expenses.validators.js.map