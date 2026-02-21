"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesController = exports.ExpensesController = void 0;
const expenses_service_1 = require("./expenses.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class ExpensesController {
    async create(req, res, next) {
        try {
            const expense = await expenses_service_1.expensesService.create(req.user.tenantId, req.body, req.user.employeeId);
            (0, responseFormatter_1.sendCreated)(res, expense, 'Expense created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await expenses_service_1.expensesService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const expense = await expenses_service_1.expensesService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, expense);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const expense = await expenses_service_1.expensesService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, expense, 'Expense updated');
        }
        catch (e) {
            next(e);
        }
    }
    async approve(req, res, next) {
        try {
            const expense = await expenses_service_1.expensesService.approve(req.params.id, req.user.tenantId, req.user.employeeId);
            (0, responseFormatter_1.sendSuccess)(res, expense, 'Expense approved');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await expenses_service_1.expensesService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.ExpensesController = ExpensesController;
exports.expensesController = new ExpensesController();
//# sourceMappingURL=expenses.controller.js.map