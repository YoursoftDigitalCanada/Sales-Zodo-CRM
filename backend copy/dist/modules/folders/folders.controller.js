"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foldersController = exports.FoldersController = void 0;
const folders_service_1 = require("./folders.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class FoldersController {
    async create(req, res, next) {
        try {
            const folder = await folders_service_1.foldersService.create(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, folder, 'Folder created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await folders_service_1.foldersService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const folder = await folders_service_1.foldersService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, folder);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const folder = await folders_service_1.foldersService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, folder, 'Folder updated');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await folders_service_1.foldersService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.FoldersController = FoldersController;
exports.foldersController = new FoldersController();
//# sourceMappingURL=folders.controller.js.map