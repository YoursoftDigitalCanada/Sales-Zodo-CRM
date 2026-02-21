"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsService = exports.ClientsService = void 0;
const clients_repository_1 = require("./clients.repository");
const clients_dto_1 = require("./clients.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class ClientsService {
    /**
     * Create a new client
     */
    async create(tenantId, data) {
        const client = await clients_repository_1.clientsRepository.create(tenantId, data);
        return (0, clients_dto_1.toClientResponseDto)(client);
    }
    /**
     * Get client by ID
     */
    async getById(id, tenantId) {
        const client = await clients_repository_1.clientsRepository.findById(id, tenantId);
        if (!client) {
            throw new HttpErrors_1.NotFoundError('Client not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return (0, clients_dto_1.toClientResponseDto)(client);
    }
    /**
     * Get clients with filters and pagination
     */
    async getMany(tenantId, query) {
        const { data, total } = await clients_repository_1.clientsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);
        return {
            data: data.map(clients_dto_1.toClientResponseDto),
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    /**
     * Update client
     */
    async update(id, tenantId, data) {
        // Check if client exists
        const existing = await clients_repository_1.clientsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Client not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const client = await clients_repository_1.clientsRepository.update(id, data);
        return (0, clients_dto_1.toClientResponseDto)(client);
    }
    /**
     * Delete client
     */
    async delete(id, tenantId) {
        const existing = await clients_repository_1.clientsRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Client not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await clients_repository_1.clientsRepository.delete(id);
    }
}
exports.ClientsService = ClientsService;
exports.clientsService = new ClientsService();
//# sourceMappingURL=clients.service.js.map