"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesController = exports.RolesController = void 0;
const roles_service_1 = require("./roles.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class RolesController {
    async create(req, res, next) {
        try {
            const role = await roles_service_1.rolesService.create(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, role, 'Role created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await roles_service_1.rolesService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const role = await roles_service_1.rolesService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, role);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const role = await roles_service_1.rolesService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, role, 'Role updated');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await roles_service_1.rolesService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.RolesController = RolesController;
exports.rolesController = new RolesController();
//# sourceMappingURL=roles.controller.js.map