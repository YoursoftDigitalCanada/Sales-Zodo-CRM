"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsManager = exports.ClientsManager = void 0;
const clients_service_1 = require("./clients.service");
/**
 * Clients Manager
 * Handles business orchestration, audit logging, and notifications
 */
class ClientsManager {
    /**
     * Create a new client with audit logging
     */
    async createClient(req, tenantId, data) {
        const client = await clients_service_1.clientsService.create(tenantId, data);
        // TODO: Add audit logging
        // await auditService.log(req, 'CREATE', 'Client', client.id);
        return client;
    }
    /**
     * Update client with audit logging
     */
    async updateClient(req, id, tenantId, data) {
        const client = await clients_service_1.clientsService.update(id, tenantId, data);
        // TODO: Add audit logging
        // await auditService.log(req, 'UPDATE', 'Client', id);
        return client;
    }
    /**
     * Delete client with audit logging
     */
    async deleteClient(req, id, tenantId) {
        await clients_service_1.clientsService.delete(id, tenantId);
        // TODO: Add audit logging
        // await auditService.log(req, 'DELETE', 'Client', id);
    }
}
exports.ClientsManager = ClientsManager;
exports.clientsManager = new ClientsManager();
//# sourceMappingURL=clients.manager.js.map