import { Request } from 'express';
import { clientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './clients.dto';

/**
 * Clients Manager
 * Handles business orchestration, audit logging, and notifications
 */
export class ClientsManager {
    /**
     * Create a new client with audit logging
     */
    async createClient(
        req: Request,
        tenantId: string,
        data: CreateClientDto
    ) {
        const client = await clientsService.create(tenantId, data);

        // TODO: Add audit logging
        // await auditService.log(req, 'CREATE', 'Client', client.id);

        return client;
    }

    /**
     * Update client with audit logging
     */
    async updateClient(
        req: Request,
        id: string,
        tenantId: string,
        data: UpdateClientDto
    ) {
        const client = await clientsService.update(id, tenantId, data);

        // TODO: Add audit logging
        // await auditService.log(req, 'UPDATE', 'Client', id);

        return client;
    }

    /**
     * Delete client with audit logging
     */
    async deleteClient(req: Request, id: string, tenantId: string) {
        await clientsService.delete(id, tenantId);

        // TODO: Add audit logging
        // await auditService.log(req, 'DELETE', 'Client', id);
    }
}

export const clientsManager = new ClientsManager();
