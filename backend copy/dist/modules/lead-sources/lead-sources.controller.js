"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadSourcesController = exports.LeadSourcesController = void 0;
const lead_sources_service_1 = require("./lead-sources.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class LeadSourcesController {
    /**
     * POST /lead-sources
     */
    async create(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const data = req.body;
            const source = await lead_sources_service_1.leadSourcesService.create(tenantId, data);
            (0, responseFormatter_1.sendCreated)(res, source, 'Lead source created successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /lead-sources
     */
    async getMany(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await lead_sources_service_1.leadSourcesService.getMany(tenantId, query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /lead-sources/active
     */
    async getActive(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const sources = await lead_sources_service_1.leadSourcesService.getActive(tenantId);
            (0, responseFormatter_1.sendSuccess)(res, sources);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /lead-sources/statistics
     */
    async getStatistics(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const statistics = await lead_sources_service_1.leadSourcesService.getStatistics(tenantId);
            (0, responseFormatter_1.sendSuccess)(res, statistics);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /lead-sources/:id
     */
    async getById(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const source = await lead_sources_service_1.leadSourcesService.getById(id, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, source);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /lead-sources/:id
     */
    async update(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const data = req.body;
            const source = await lead_sources_service_1.leadSourcesService.update(id, tenantId, data);
            (0, responseFormatter_1.sendSuccess)(res, source, 'Lead source updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /lead-sources/:id
     */
    async delete(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            await lead_sources_service_1.leadSourcesService.delete(id, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LeadSourcesController = LeadSourcesController;
exports.leadSourcesController = new LeadSourcesController();
//# sourceMappingURL=lead-sources.controller.js.map