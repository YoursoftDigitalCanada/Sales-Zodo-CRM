"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersService = exports.UsersService = void 0;
const users_repository_1 = require("./users.repository");
const users_dto_1 = require("./users.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class UsersService {
    async create(tenantId, data) {
        const existing = await users_repository_1.usersRepository.findByEmail(data.email, tenantId);
        if (existing) {
            throw new HttpErrors_1.BadRequestError('Email already exists', errorCodes_1.ErrorCodes.EMAIL_EXISTS);
        }
        const user = await users_repository_1.usersRepository.create(tenantId, data);
        return (0, users_dto_1.toUserResponseDto)(user);
    }
    async getById(id, tenantId) {
        const user = await users_repository_1.usersRepository.findById(id, tenantId);
        if (!user)
            throw new HttpErrors_1.NotFoundError('User not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, users_dto_1.toUserResponseDto)(user);
    }
    async getMany(tenantId, query) {
        const { data, total } = await users_repository_1.usersRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);
        return {
            data: data.map(users_dto_1.toUserResponseDto),
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await users_repository_1.usersRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('User not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const user = await users_repository_1.usersRepository.update(id, tenantId, data);
        return (0, users_dto_1.toUserResponseDto)(user);
    }
    async delete(id, tenantId) {
        const existing = await users_repository_1.usersRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('User not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await users_repository_1.usersRepository.delete(id);
    }
    async updateStatus(id, tenantId, isActive) {
        const existing = await users_repository_1.usersRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('User not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const user = await users_repository_1.usersRepository.updateStatus(id, isActive);
        return (0, users_dto_1.toUserResponseDto)(user);
    }
}
exports.UsersService = UsersService;
exports.usersService = new UsersService();
//# sourceMappingURL=users.service.js.map