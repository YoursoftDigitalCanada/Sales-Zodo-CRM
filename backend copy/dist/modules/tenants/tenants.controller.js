"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsController = exports.TenantsController = void 0;
const tenants_service_1 = require("./tenants.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class TenantsController {
    async create(req, res, next) {
        try {
            const tenant = await tenants_service_1.tenantsService.create(req.body);
            (0, responseFormatter_1.sendCreated)(res, tenant, 'Tenant created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await tenants_service_1.tenantsService.getMany(req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const tenant = await tenants_service_1.tenantsService.getById(req.params.id);
            (0, responseFormatter_1.sendSuccess)(res, tenant);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const tenant = await tenants_service_1.tenantsService.update(req.params.id, req.body);
            (0, responseFormatter_1.sendSuccess)(res, tenant, 'Tenant updated');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await tenants_service_1.tenantsService.delete(req.params.id);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.TenantsController = TenantsController;
exports.tenantsController = new TenantsController();
//# sourceMappingURL=tenants.controller.js.map