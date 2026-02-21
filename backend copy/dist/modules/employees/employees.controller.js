"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeesController = exports.EmployeesController = void 0;
const employees_service_1 = require("./employees.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class EmployeesController {
    async create(req, res, next) {
        try {
            const emp = await employees_service_1.employeesService.create(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, emp, 'Employee created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await employees_service_1.employeesService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const emp = await employees_service_1.employeesService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, emp);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const emp = await employees_service_1.employeesService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, emp, 'Employee updated');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await employees_service_1.employeesService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.EmployeesController = EmployeesController;
exports.employeesController = new EmployeesController();
//# sourceMappingURL=employees.controller.js.map