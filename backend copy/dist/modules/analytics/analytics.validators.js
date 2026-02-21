"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportTypeSchema = exports.analyticsQuerySchema = void 0;
const zod_1 = require("zod");
exports.analyticsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        period: zod_1.z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
        groupBy: zod_1.z.enum(['status', 'source', 'assignee', 'date']).optional(),
    }),
});
exports.reportTypeSchema = zod_1.z.object({
    params: zod_1.z.object({
        type: zod_1.z.enum(['leads', 'clients', 'tasks', 'projects', 'revenue', 'expenses', 'overview']),
    }),
});
//# sourceMappingURL=analytics.validators.js.map