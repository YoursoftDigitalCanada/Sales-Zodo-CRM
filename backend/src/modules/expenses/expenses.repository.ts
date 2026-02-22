import { PrismaClient, Prisma, ExpenseStatus, ExpenseCategory } from '@prisma/client';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './expenses.dto';

const prisma = new PrismaClient();
const expenseInclude = {
    createdBy: { include: { user: { select: { firstName: true, lastName: true } } } },
    approvedBy: { include: { user: { select: { firstName: true, lastName: true } } } },
};

export class ExpensesRepository {
    async create(tenantId: string, data: CreateExpenseDto, createdById: string) {
        return prisma.expense.create({
            data: {
                tenantId,
                title: data.title,
                description: data.description,
                category: data.category,
                amount: data.amount,
                currency: data.currency || 'USD',
                paymentMethod: data.paymentMethod,
                paymentDate: new Date(data.paymentDate),
                vendor: data.vendor,
                receiptNumber: data.receiptNumber,
                status: data.status || 'DRAFT',
                isReimbursable: data.isReimbursable || false,
                budgetId: data.budgetId,
                createdById,
            },
            include: expenseInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.expense.findFirst({ where: { id, tenantId }, include: expenseInclude });
    }

    async findMany(tenantId: string, query: ExpenseQueryDto) {
        const { page = 1, limit = 20, search, status, category, sortBy = 'paymentDate', sortOrder = 'desc' } = query;
        const where: Prisma.ExpenseWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(category && { category }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { vendor: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.expense.findMany({ where, include: expenseInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.expense.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateExpenseDto) {
        // Verify tenant ownership
        const existing = await prisma.expense.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Expense not found or access denied');

        return prisma.expense.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.amount !== undefined && { amount: data.amount }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
                ...(data.paymentDate !== undefined && { paymentDate: new Date(data.paymentDate) }),
                ...(data.vendor !== undefined && { vendor: data.vendor }),
                ...(data.receiptNumber !== undefined && { receiptNumber: data.receiptNumber }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.isReimbursable !== undefined && { isReimbursable: data.isReimbursable }),
                ...(data.budgetId !== undefined && { budgetId: data.budgetId }),
            },
            include: expenseInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped delete
        const existing = await prisma.expense.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Expense not found or access denied');
        return prisma.expense.delete({ where: { id } });
    }

    async approve(id: string, tenantId: string, approvedById: string) {
        // Verify tenant ownership
        const existing = await prisma.expense.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Expense not found or access denied');

        return prisma.expense.update({
            where: { id },
            data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
            include: expenseInclude,
        });
    }
}

export const expensesRepository = new ExpensesRepository();
