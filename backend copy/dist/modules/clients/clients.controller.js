"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsController = exports.ClientsController = void 0;
const clients_service_1 = require("./clients.service");
const clients_manager_1 = require("./clients.manager");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class ClientsController {
    /**
     * POST /clients
     * Create a new client
     */
    async create(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const data = req.body;
            const client = await clients_manager_1.clientsManager.createClient(req, tenantId, data);
            (0, responseFormatter_1.sendCreated)(res, client, 'Client created successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /clients
     * Get clients with filters and pagination
     */
    async getMany(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await clients_service_1.clientsService.getMany(tenantId, query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /clients/:id
     * Get client by ID
     */
    async getById(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const client = await clients_service_1.clientsService.getById(id, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, client);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /clients/:id
     * Update client
     */
    async update(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const data = req.body;
            const client = await clients_manager_1.clientsManager.updateClient(req, id, tenantId, data);
            (0, responseFormatter_1.sendSuccess)(res, client, 'Client updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /clients/:id
     * Delete client
     */
    async delete(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            await clients_manager_1.clientsManager.deleteClient(req, id, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ClientsController = ClientsController;
exports.clientsController = new ClientsController();
//# sourceMappingURL=clients.controller.js.map