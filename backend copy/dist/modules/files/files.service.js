"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filesService = exports.FilesService = void 0;
const files_repository_1 = require("./files.repository");
const files_dto_1 = require("./files.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class FilesService {
    async create(tenantId, data, uploadedById) {
        const file = await files_repository_1.filesRepository.create(tenantId, data, uploadedById);
        return (0, files_dto_1.toFileResponseDto)(file);
    }
    async getById(id, tenantId) {
        const file = await files_repository_1.filesRepository.findById(id, tenantId);
        if (!file)
            throw new HttpErrors_1.NotFoundError('File not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, files_dto_1.toFileResponseDto)(file);
    }
    async getMany(tenantId, query) {
        const { data, total } = await files_repository_1.filesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(files_dto_1.toFileResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await files_repository_1.filesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('File not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const file = await files_repository_1.filesRepository.update(id, data);
        return (0, files_dto_1.toFileResponseDto)(file);
    }
    async delete(id, tenantId) {
        const existing = await files_repository_1.filesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('File not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        // TODO: Also delete from storage
        await files_repository_1.filesRepository.delete(id);
    }
}
exports.FilesService = FilesService;
exports.filesService = new FilesService();
//# sourceMappingURL=files.service.js.map