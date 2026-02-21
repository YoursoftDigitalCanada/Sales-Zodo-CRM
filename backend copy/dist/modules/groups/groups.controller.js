"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupsController = exports.GroupsController = void 0;
const groups_service_1 = require("./groups.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class GroupsController {
    async create(req, res, next) {
        try {
            const group = await groups_service_1.groupsService.create(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, group, 'Group created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await groups_service_1.groupsService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const group = await groups_service_1.groupsService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, group);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const group = await groups_service_1.groupsService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, group, 'Group updated');
        }
        catch (e) {
            next(e);
        }
    }
    async addMembers(req, res, next) {
        try {
            await groups_service_1.groupsService.addMembers(req.params.id, req.user.tenantId, req.body.clientIds);
            (0, responseFormatter_1.sendSuccess)(res, null, 'Members added');
        }
        catch (e) {
            next(e);
        }
    }
    async removeMembers(req, res, next) {
        try {
            await groups_service_1.groupsService.removeMembers(req.params.id, req.user.tenantId, req.body.clientIds);
            (0, responseFormatter_1.sendSuccess)(res, null, 'Members removed');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await groups_service_1.groupsService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.GroupsController = GroupsController;
exports.groupsController = new GroupsController();
//# sourceMappingURL=groups.controller.js.map