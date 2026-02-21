"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagsController = exports.TagsController = void 0;
const tags_service_1 = require("./tags.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class TagsController {
    async create(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const tag = await tags_service_1.tagsService.create(tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, tag, 'Tag created successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getMany(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const result = await tags_service_1.tagsService.getMany(tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const tags = await tags_service_1.tagsService.getAll(tenantId);
            (0, responseFormatter_1.sendSuccess)(res, tags);
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const tag = await tags_service_1.tagsService.getById(req.params.id, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, tag);
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const tag = await tags_service_1.tagsService.update(req.params.id, tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, tag, 'Tag updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            await tags_service_1.tagsService.delete(req.params.id, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TagsController = TagsController;
exports.tagsController = new TagsController();
//# sourceMappingURL=tags.controller.js.map