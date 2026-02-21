"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesService = exports.RolesService = void 0;
const roles_repository_1 = require("./roles.repository");
const roles_dto_1 = require("./roles.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class RolesService {
    async create(tenantId, data) {
        const role = await roles_repository_1.rolesRepository.create(tenantId, data);
        return (0, roles_dto_1.toRoleResponseDto)(role);
    }
    async getById(id, tenantId) {
        const role = await roles_repository_1.rolesRepository.findById(id, tenantId);
        if (!role)
            throw new HttpErrors_1.NotFoundError('Role not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, roles_dto_1.toRoleResponseDto)(role);
    }
    async getMany(tenantId, query) {
        const { data, total } = await roles_repository_1.rolesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(roles_dto_1.toRoleResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await roles_repository_1.rolesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Role not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const role = await roles_repository_1.rolesRepository.update(id, data);
        return (0, roles_dto_1.toRoleResponseDto)(role);
    }
    async delete(id, tenantId) {
        const existing = await roles_repository_1.rolesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Role not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await roles_repository_1.rolesRepository.delete(id);
    }
}
exports.RolesService = RolesService;
exports.rolesService = new RolesService();
//# sourceMappingURL=roles.service.js.map