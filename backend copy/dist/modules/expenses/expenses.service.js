"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesService = exports.ExpensesService = void 0;
const expenses_repository_1 = require("./expenses.repository");
const expenses_dto_1 = require("./expenses.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class ExpensesService {
    async create(tenantId, data, submittedById) {
        const expense = await expenses_repository_1.expensesRepository.create(tenantId, data, submittedById);
        return (0, expenses_dto_1.toExpenseResponseDto)(expense);
    }
    async getById(id, tenantId) {
        const expense = await expenses_repository_1.expensesRepository.findById(id, tenantId);
        if (!expense)
            throw new HttpErrors_1.NotFoundError('Expense not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, expenses_dto_1.toExpenseResponseDto)(expense);
    }
    async getMany(tenantId, query) {
        const { data, total } = await expenses_repository_1.expensesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(expenses_dto_1.toExpenseResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await expenses_repository_1.expensesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Expense not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const expense = await expenses_repository_1.expensesRepository.update(id, data);
        return (0, expenses_dto_1.toExpenseResponseDto)(expense);
    }
    async delete(id, tenantId) {
        const existing = await expenses_repository_1.expensesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Expense not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await expenses_repository_1.expensesRepository.delete(id);
    }
    async approve(id, tenantId, approvedById) {
        const existing = await expenses_repository_1.expensesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Expense not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const expense = await expenses_repository_1.expensesRepository.approve(id, approvedById);
        return (0, expenses_dto_1.toExpenseResponseDto)(expense);
    }
}
exports.ExpensesService = ExpensesService;
exports.expensesService = new ExpensesService();
//# sourceMappingURL=expenses.service.js.map