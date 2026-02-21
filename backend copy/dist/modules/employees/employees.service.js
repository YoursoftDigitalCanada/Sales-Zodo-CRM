"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeesService = exports.EmployeesService = void 0;
const employees_repository_1 = require("./employees.repository");
const employees_dto_1 = require("./employees.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class EmployeesService {
    async create(tenantId, data) {
        const emp = await employees_repository_1.employeesRepository.create(tenantId, data);
        return (0, employees_dto_1.toEmployeeResponseDto)(emp);
    }
    async getById(id, tenantId) {
        const emp = await employees_repository_1.employeesRepository.findById(id, tenantId);
        if (!emp)
            throw new HttpErrors_1.NotFoundError('Employee not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, employees_dto_1.toEmployeeResponseDto)(emp);
    }
    async getMany(tenantId, query) {
        const { data, total } = await employees_repository_1.employeesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(employees_dto_1.toEmployeeResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await employees_repository_1.employeesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Employee not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const emp = await employees_repository_1.employeesRepository.update(id, data);
        return (0, employees_dto_1.toEmployeeResponseDto)(emp);
    }
    async delete(id, tenantId) {
        const existing = await employees_repository_1.employeesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Employee not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await employees_repository_1.employeesRepository.delete(id);
    }
}
exports.EmployeesService = EmployeesService;
exports.employeesService = new EmployeesService();
//# sourceMappingURL=employees.service.js.map