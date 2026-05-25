import { expensesRepository } from './expenses.repository';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto, toExpenseResponseDto } from './expenses.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { activityLogger } from '../../common/services/activity-logger.service';
import { bookkeepingService } from '../bookkeeping/bookkeeping.service';
import { logger } from '../../common/utils/logger';

function logBookkeepingSyncFailure(tenantId: string, sourceType: string, sourceId: string, error: unknown) {
    logger.warn('[Expenses] Bookkeeping sync failed', {
        tenantId,
        sourceType,
        sourceId,
        error: (error as Error)?.message || String(error),
    });
    activityLogger.log({
        tenantId,
        entityType: sourceType,
        entityId: sourceId,
        action: 'UPDATE',
        module: 'bookkeeping',
        description: `Bookkeeping sync failed for ${sourceType.toLowerCase()}`,
        metadata: { error: (error as Error)?.message || String(error) },
    });
}

export class ExpensesService {
    async create(tenantId: string, data: CreateExpenseDto, submittedById?: string) {
        const expense = await expensesRepository.create(tenantId, data, submittedById || '');
        const dto = toExpenseResponseDto(expense);

        eventBus.emit('expense.created', {
            tenantId,
            expenseId: dto.id,
            amount: (expense as any).amount,
            category: (expense as any).category,
            submittedById,
        });

        activityLogger.log({
            tenantId, entityType: 'Expense', entityId: dto.id,
            action: 'CREATE', module: 'expenses',
            description: `Created expense "${dto.id}"`,
            userId: submittedById,
            metadata: { amount: (expense as any).amount, category: (expense as any).category },
        });

        bookkeepingService.syncExpense(tenantId, dto.id).catch((error) => logBookkeepingSyncFailure(tenantId, 'Expense', dto.id, error));

        return dto;
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
        const expense = await expensesRepository.update(id, tenantId, data);
        const dto = toExpenseResponseDto(expense);

        activityLogger.log({
            tenantId, entityType: 'Expense', entityId: dto.id,
            action: 'UPDATE', module: 'expenses',
            description: `Updated expense "${dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        eventBus.emit('expense.updated', {
            tenantId,
            expenseId: dto.id,
            amount: (expense as any).amount,
            category: (expense as any).category,
        });

        bookkeepingService.syncExpense(tenantId, dto.id).catch((error) => logBookkeepingSyncFailure(tenantId, 'Expense', dto.id, error));

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await expensesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Expense not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Expense', entityId: id,
            action: 'DELETE', module: 'expenses',
            description: `Deleted expense "${id}"`,
        });

        await expensesRepository.delete(id, tenantId);
        bookkeepingService.voidSourceTransaction(tenantId, 'EXPENSE', id).catch((error) => logBookkeepingSyncFailure(tenantId, 'Expense', id, error));
        eventBus.emit('expense.deleted', {
            tenantId,
            expenseId: id,
        });
    }

    async approve(id: string, tenantId: string, approvedById: string) {
        const existing = await expensesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Expense not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const expense = await expensesRepository.approve(id, tenantId, approvedById);
        const dto = toExpenseResponseDto(expense);

        eventBus.emit('expense.approved', {
            tenantId,
            expenseId: dto.id,
            amount: (expense as any).amount,
            approvedById,
        });

        activityLogger.log({
            tenantId, entityType: 'Expense', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'expenses',
            description: `Expense "${dto.id}" approved`,
            userId: approvedById,
            metadata: { newStatus: 'APPROVED' },
        });

        bookkeepingService.syncExpense(tenantId, dto.id).catch((error) => logBookkeepingSyncFailure(tenantId, 'Expense', dto.id, error));

        return dto;
    }
}

export const expensesService = new ExpensesService();
