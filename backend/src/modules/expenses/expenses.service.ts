import { expensesRepository } from './expenses.repository';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto, toExpenseResponseDto } from './expenses.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class ExpensesService {
    async create(tenantId: string, data: CreateExpenseDto, submittedById?: string) {
        const expense = await expensesRepository.create(tenantId, data, submittedById || '');
        return toExpenseResponseDto(expense);
    }

    async getById(id: string, tenantId: string) {
        const expense = await expensesRepository.findById(id, tenantId);
        if (!expense) throw new NotFoundError('Expense not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toExpenseResponseDto(expense);
    }

    async getMany(tenantId: string, query: ExpenseQueryDto) {
        const { data, total } = await expensesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toExpenseResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateExpenseDto) {
        const existing = await expensesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Expense not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const expense = await expensesRepository.update(id, data);
        return toExpenseResponseDto(expense);
    }

    async delete(id: string, tenantId: string) {
        const existing = await expensesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Expense not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await expensesRepository.delete(id);
    }

    async approve(id: string, tenantId: string, approvedById: string) {
        const existing = await expensesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Expense not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const expense = await expensesRepository.approve(id, approvedById);
        return toExpenseResponseDto(expense);
    }
}

export const expensesService = new ExpensesService();
