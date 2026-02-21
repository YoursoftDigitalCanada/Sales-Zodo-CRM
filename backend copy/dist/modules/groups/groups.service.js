"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupsService = exports.GroupsService = void 0;
const groups_repository_1 = require("./groups.repository");
const groups_dto_1 = require("./groups.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class GroupsService {
    async create(tenantId, data) {
        const group = await groups_repository_1.groupsRepository.create(tenantId, data);
        return (0, groups_dto_1.toGroupResponseDto)(group);
    }
    async getById(id, tenantId) {
        const group = await groups_repository_1.groupsRepository.findById(id, tenantId);
        if (!group)
            throw new HttpErrors_1.NotFoundError('Group not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, groups_dto_1.toGroupResponseDto)(group);
    }
    async getMany(tenantId, query) {
        const { data, total } = await groups_repository_1.groupsRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(groups_dto_1.toGroupResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await groups_repository_1.groupsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Group not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const group = await groups_repository_1.groupsRepository.update(id, data);
        return (0, groups_dto_1.toGroupResponseDto)(group);
    }
    async delete(id, tenantId) {
        const existing = await groups_repository_1.groupsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Group not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await groups_repository_1.groupsRepository.delete(id);
    }
    async addMembers(id, tenantId, clientIds) {
        const existing = await groups_repository_1.groupsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Group not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await groups_repository_1.groupsRepository.addMembers(id, clientIds);
    }
    async removeMembers(id, tenantId, clientIds) {
        const existing = await groups_repository_1.groupsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Group not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await groups_repository_1.groupsRepository.removeMembers(id, clientIds);
    }
}
exports.GroupsService = GroupsService;
exports.groupsService = new GroupsService();
//# sourceMappingURL=groups.service.js.map