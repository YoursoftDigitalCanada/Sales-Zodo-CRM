"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagsService = exports.TagsService = void 0;
const tags_repository_1 = require("./tags.repository");
const tags_dto_1 = require("./tags.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class TagsService {
    async create(tenantId, data) {
        const existing = await tags_repository_1.tagsRepository.findByName(data.name, tenantId);
        if (existing) {
            throw new HttpErrors_1.ConflictError('A tag with this name already exists');
        }
        const tag = await tags_repository_1.tagsRepository.create(tenantId, data);
        return (0, tags_dto_1.toTagResponseDto)(tag);
    }
    async getById(id, tenantId) {
        const tag = await tags_repository_1.tagsRepository.findById(id, tenantId);
        if (!tag) {
            throw new HttpErrors_1.NotFoundError('Tag not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return (0, tags_dto_1.toTagResponseDto)(tag);
    }
    async getMany(tenantId, query) {
        const { data, total } = await tags_repository_1.tagsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 50;
        return {
            data: data.map(tags_dto_1.toTagResponseDto),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getAll(tenantId) {
        const tags = await tags_repository_1.tagsRepository.findAll(tenantId);
        return tags.map(tags_dto_1.toTagResponseDto);
    }
    async update(id, tenantId, data) {
        const existing = await tags_repository_1.tagsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Tag not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        if (data.name && data.name !== existing.name) {
            const duplicate = await tags_repository_1.tagsRepository.findByName(data.name, tenantId, id);
            if (duplicate) {
                throw new HttpErrors_1.ConflictError('A tag with this name already exists');
            }
        }
        const tag = await tags_repository_1.tagsRepository.update(id, tenantId, data);
        return (0, tags_dto_1.toTagResponseDto)(tag);
    }
    async delete(id, tenantId) {
        const existing = await tags_repository_1.tagsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Tag not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await tags_repository_1.tagsRepository.delete(id, tenantId);
    }
}
exports.TagsService = TagsService;
exports.tagsService = new TagsService();
//# sourceMappingURL=tags.service.js.map