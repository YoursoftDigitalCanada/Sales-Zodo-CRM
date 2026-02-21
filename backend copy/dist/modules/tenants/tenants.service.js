"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsService = exports.TenantsService = void 0;
const tenants_repository_1 = require("./tenants.repository");
const tenants_dto_1 = require("./tenants.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class TenantsService {
    async create(data) {
        const existing = await tenants_repository_1.tenantsRepository.findBySlug(data.slug);
        if (existing)
            throw new HttpErrors_1.BadRequestError('Tenant slug already exists', errorCodes_1.ErrorCodes.EMAIL_EXISTS);
        const tenant = await tenants_repository_1.tenantsRepository.create(data);
        return (0, tenants_dto_1.toTenantResponseDto)(tenant);
    }
    async getById(id) {
        const tenant = await tenants_repository_1.tenantsRepository.findById(id);
        if (!tenant)
            throw new HttpErrors_1.NotFoundError('Tenant not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, tenants_dto_1.toTenantResponseDto)(tenant);
    }
    async getMany(query) {
        const { data, total } = await tenants_repository_1.tenantsRepository.findMany(query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(tenants_dto_1.toTenantResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, data) {
        const existing = await tenants_repository_1.tenantsRepository.findById(id);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Tenant not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const tenant = await tenants_repository_1.tenantsRepository.update(id, data);
        return (0, tenants_dto_1.toTenantResponseDto)(tenant);
    }
    async delete(id) {
        const existing = await tenants_repository_1.tenantsRepository.findById(id);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Tenant not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await tenants_repository_1.tenantsRepository.delete(id);
    }
}
exports.TenantsService = TenantsService;
exports.tenantsService = new TenantsService();
//# sourceMappingURL=tenants.service.js.map