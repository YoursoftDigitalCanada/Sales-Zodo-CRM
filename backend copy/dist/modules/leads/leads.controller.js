"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsController = exports.LeadsController = void 0;
const leads_service_1 = require("./leads.service");
const leads_manager_1 = require("./leads.manager");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class LeadsController {
    /**
     * POST /leads
     * Create a new lead
     */
    async create(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const employeeId = req.user.employeeId;
            const data = req.body;
            const lead = await leads_manager_1.leadsManager.createLead(req, tenantId, data, employeeId);
            (0, responseFormatter_1.sendCreated)(res, lead, 'Lead created successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /leads
     * Get leads with filters and pagination
     */
    async getMany(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await leads_service_1.leadsService.getMany(tenantId, query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /leads/pipeline
     * Get leads grouped by status (pipeline view)
     */
    async getPipeline(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { assignedToId, leadSourceId, temperature } = req.query;
            const pipeline = await leads_service_1.leadsService.getPipeline(tenantId, {
                assignedToId,
                leadSourceId,
                temperature,
            });
            (0, responseFormatter_1.sendSuccess)(res, pipeline);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /leads/statistics
     * Get lead statistics
     */
    async getStatistics(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { startDate, endDate } = req.query;
            const statistics = await leads_service_1.leadsService.getStatistics(tenantId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            (0, responseFormatter_1.sendSuccess)(res, statistics);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /leads/:id
     * Get lead by ID
     */
    async getById(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const lead = await leads_service_1.leadsService.getById(id, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, lead);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /leads/:id/activities
     * Get lead activities
     */
    async getActivities(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const activities = await leads_manager_1.leadsManager.getActivities(tenantId, id, limit);
            (0, responseFormatter_1.sendSuccess)(res, activities);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /leads/:id
     * Update lead
     */
    async update(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const employeeId = req.user.employeeId;
            const { id } = req.params;
            const data = req.body;
            const lead = await leads_manager_1.leadsManager.updateLead(req, id, tenantId, data, employeeId);
            (0, responseFormatter_1.sendSuccess)(res, lead, 'Lead updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /leads/:id/status
     * Update lead status
     */
    async updateStatus(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const { status } = req.body;
            const lead = await leads_manager_1.leadsManager.updateLeadStatus(req, id, tenantId, status);
            (0, responseFormatter_1.sendSuccess)(res, lead, 'Lead status updated');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /leads/:id/assign
     * Assign lead to employee
     */
    async assign(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const employeeId = req.user.employeeId;
            const { id } = req.params;
            const { assignedToId } = req.body;
            const lead = await leads_manager_1.leadsManager.assignLead(req, id, tenantId, assignedToId, employeeId);
            (0, responseFormatter_1.sendSuccess)(res, lead, 'Lead assigned successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /leads/:id/convert
     * Convert lead to client
     */
    async convert(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const options = req.body;
            const result = await leads_manager_1.leadsManager.convertLeadToClient(req, id, tenantId, options);
            (0, responseFormatter_1.sendSuccess)(res, result, 'Lead converted to client successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /leads/:id
     * Delete lead
     */
    async delete(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            await leads_manager_1.leadsManager.deleteLead(req, id, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /leads/bulk/assign
     * Bulk assign leads
     */
    async bulkAssign(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const employeeId = req.user.employeeId;
            const { leadIds, assignedToId } = req.body;
            const count = await leads_manager_1.leadsManager.bulkAssignLeads(req, leadIds, tenantId, assignedToId, employeeId);
            (0, responseFormatter_1.sendSuccess)(res, { updatedCount: count }, `${count} leads assigned`);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /leads/bulk/status
     * Bulk update lead status
     */
    async bulkUpdateStatus(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { leadIds, status } = req.body;
            const count = await leads_service_1.leadsService.bulkUpdateStatus(leadIds, tenantId, status);
            (0, responseFormatter_1.sendSuccess)(res, { updatedCount: count }, `${count} leads updated`);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /leads/import
     * Import leads
     */
    async import(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const employeeId = req.user.employeeId;
            const { leads } = req.body;
            const result = await leads_manager_1.leadsManager.importLeads(req, tenantId, leads, employeeId);
            (0, responseFormatter_1.sendSuccess)(res, result, `Imported ${result.imported} leads`);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /leads/export
     * Export leads
     */
    async export(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.body;
            const data = await leads_manager_1.leadsManager.exportLeads(req, tenantId, query);
            (0, responseFormatter_1.sendSuccess)(res, data);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LeadsController = LeadsController;
exports.leadsController = new LeadsController();
//# sourceMappingURL=leads.controller.js.map