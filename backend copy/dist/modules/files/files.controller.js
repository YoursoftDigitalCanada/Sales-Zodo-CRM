"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filesController = exports.FilesController = void 0;
const files_service_1 = require("./files.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class FilesController {
    async upload(req, res, next) {
        try {
            // In practice, you'd handle file upload middleware here (multer, etc.)
            const file = await files_service_1.filesService.create(req.user.tenantId, req.body, req.user.employeeId);
            (0, responseFormatter_1.sendCreated)(res, file, 'File uploaded');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await files_service_1.filesService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const file = await files_service_1.filesService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, file);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const file = await files_service_1.filesService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, file, 'File updated');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await files_service_1.filesService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.FilesController = FilesController;
exports.filesController = new FilesController();
//# sourceMappingURL=files.controller.js.map