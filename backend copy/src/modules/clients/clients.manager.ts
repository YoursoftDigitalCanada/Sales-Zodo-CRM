import { Request } from 'express';
import { clientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './clients.dto';
import { auditService } from '../audit/audit.service';
import { eventBus } from '../../common/events/event-bus';

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

        await auditService.logCreate(req, 'clients', 'Client', client.id, {
            clientName: client.clientName,
            clientType: client.clientType,
            primaryEmail: client.primaryEmail,
            status: client.status,
        });

        // Emit event for automation
        eventBus.emit('client.created', {
            tenantId,
            clientId: client.id,
            clientName: client.clientName,
            clientType: client.clientType,
            ownerUserId: req.user?.userId,
        });

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
        const existing = await clientsService.getById(id, tenantId);
        const client = await clientsService.update(id, tenantId, data);

        await auditService.logUpdate(req, 'clients', 'Client', id, existing, client);

        return client;
    }

    /**
     * Delete client with audit logging
     */
    async deleteClient(req: Request, id: string, tenantId: string) {
        const existing = await clientsService.getById(id, tenantId);
        await clientsService.delete(id, tenantId);

        await auditService.logDelete(req, 'clients', 'Client', id, {
            clientName: (existing as any)?.clientName,
        });
    }
}

export const clientsManager = new ClientsManager();
