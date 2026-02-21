"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foldersService = exports.FoldersService = void 0;
const folders_repository_1 = require("./folders.repository");
const folders_dto_1 = require("./folders.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class FoldersService {
    async create(tenantId, data) {
        const folder = await folders_repository_1.foldersRepository.create(tenantId, data);
        return (0, folders_dto_1.toFolderResponseDto)(folder);
    }
    async getById(id, tenantId) {
        const folder = await folders_repository_1.foldersRepository.findById(id, tenantId);
        if (!folder)
            throw new HttpErrors_1.NotFoundError('Folder not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, folders_dto_1.toFolderResponseDto)(folder);
    }
    async getMany(tenantId, query) {
        const { data, total } = await folders_repository_1.foldersRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 50;
        return {
            data: data.map(folders_dto_1.toFolderResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await folders_repository_1.foldersRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Folder not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const folder = await folders_repository_1.foldersRepository.update(id, data);
        return (0, folders_dto_1.toFolderResponseDto)(folder);
    }
    async delete(id, tenantId) {
        const existing = await folders_repository_1.foldersRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Folder not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await folders_repository_1.foldersRepository.delete(id);
    }
}
exports.FoldersService = FoldersService;
exports.foldersService = new FoldersService();
//# sourceMappingURL=folders.service.js.map