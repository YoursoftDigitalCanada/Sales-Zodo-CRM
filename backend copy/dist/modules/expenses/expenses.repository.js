"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesRepository = exports.ExpensesRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const expenseInclude = {
    submittedBy: { include: { user: { select: { firstName: true, lastName: true } } } },
    project: { select: { id: true, name: true } },
    client: { select: { id: true, companyName: true, firstName: true, lastName: true, clientType: true } },
};
class ExpensesRepository {
    async create(tenantId, data, submittedById) {
        return prisma.expense.create({
            data: {
                tenantId,
                category: data.category,
                description: data.description,
                amount: data.amount,
                currency: data.currency || 'USD',
                expenseDate: new Date(data.expenseDate),
                status: data.status || 'PENDING',
                receipt: data.receipt,
                projectId: data.projectId,
                clientId: data.clientId,
                notes: data.notes,
                submittedById,
            },
            include: expenseInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.expense.findFirst({ where: { id, tenantId }, include: expenseInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, status, category, sortBy = 'expenseDate', sortOrder = 'desc' } = query;
        const where = {
            tenantId,
            ...(status && { status }),
            ...(category && { category: { contains: category, mode: 'insensitive' } }),
            ...(search && { description: { contains: search, mode: 'insensitive' } }),
        };
        const [data, total] = await Promise.all([
            prisma.expense.findMany({ where, include: expenseInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.expense.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.expense.update({
            where: { id },
            data: {
                ...(data.category !== undefined && { category: data.category }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.amount !== undefined && { amount: data.amount }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.expenseDate !== undefined && { expenseDate: new Date(data.expenseDate) }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.receipt !== undefined && { receipt: data.receipt }),
                ...(data.projectId !== undefined && { projectId: data.projectId }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.notes !== undefined && { notes: data.notes }),
            },
            include: expenseInclude,
        });
    }
    async delete(id) {
        return prisma.expense.delete({ where: { id } });
    }
    async approve(id, approvedById) {
        return prisma.expense.update({
            where: { id },
            data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
            include: expenseInclude,
        });
    }
}
exports.ExpensesRepository = ExpensesRepository;
exports.expensesRepository = new ExpensesRepository();
//# sourceMappingURL=expenses.repository.js.map