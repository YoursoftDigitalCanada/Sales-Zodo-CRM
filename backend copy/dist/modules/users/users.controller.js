"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersController = exports.UsersController = void 0;
const users_service_1 = require("./users.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class UsersController {
    async create(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const user = await users_service_1.usersService.create(tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, user, 'User created successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getMany(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const result = await users_service_1.usersService.getMany(tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const user = await users_service_1.usersService.getById(req.params.id, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, user);
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const user = await users_service_1.usersService.update(req.params.id, tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, user, 'User updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const user = await users_service_1.usersService.updateStatus(req.params.id, tenantId, req.body.isActive);
            (0, responseFormatter_1.sendSuccess)(res, user, 'User status updated');
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            await users_service_1.usersService.delete(req.params.id, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UsersController = UsersController;
exports.usersController = new UsersController();
//# sourceMappingURL=users.controller.js.map