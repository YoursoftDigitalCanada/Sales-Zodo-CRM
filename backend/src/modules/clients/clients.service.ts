import { clientsRepository } from './clients.repository';
import {
    CreateClientDto,
    UpdateClientDto,
    ClientQueryDto,
    ClientResponseDto,
    toClientResponseDto,
} from './clients.dto';
import {
    NotFoundError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { activityLogger } from '../../common/services/activity-logger.service';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { prisma } from '../../config/database';
import { DataAccessContext } from '../../common/access/data-access';

export class ClientsService {
    /**
     * Create a new client
     */
    async create(tenantId: string, data: CreateClientDto, createdByUserId?: string): Promise<ClientResponseDto> {
        const client = await clientsRepository.create(tenantId, data);
        const dto = toClientResponseDto(client);

        // Auto-create primary contact if contactName is provided
        if (data.contactName && data.contactName.trim()) {
            try {
                await prisma.contact.create({
                    data: {
                        tenantId,
                        companyId: client.id,
                        contactName: data.contactName.trim(),
                        email: (client as any).primaryEmail || '',
                        jobTitle: data.position || null,
                        officePhone: data.directPhone || null,
                        isPrimaryContact: true,
                        type: 'CLIENT',
                    },
                });
            } catch (err) {
                // Non-critical: log but don't fail client creation
                console.error('[ClientsService] Auto-create contact failed:', err);
            }
        }

        // Domain event: client created
        eventBus.emit('client.created', {
            tenantId,
            clientId: dto.id,
            clientName: dto.clientName,
            clientType: dto.clientType,
            ownerUserId: createdByUserId,
        });

        // Timeline: log creation
        activityLogger.log({
            tenantId, entityType: 'Client', entityId: dto.id,
            action: 'CREATE', module: 'clients',
            description: `Created client "${dto.clientName}"`,
            userId: createdByUserId,
            metadata: { clientName: dto.clientName, clientType: dto.clientType },
        });

        return dto;
    }

    /**
     * Get client by ID
     */
    async getById(id: string, tenantId: string): Promise<ClientResponseDto> {
        const client = await clientsRepository.findById(id, tenantId);

        if (!client) {
            throw new NotFoundError('Client not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return toClientResponseDto(client);
    }

    /**
     * Get clients with filters and pagination
     */
    async getMany(tenantId: string, query: ClientQueryDto, dataAccess?: DataAccessContext) {
        const { data, total } = await clientsRepository.findMany(tenantId, query, dataAccess);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map(toClientResponseDto),
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
    async update(id: string, tenantId: string, data: UpdateClientDto): Promise<ClientResponseDto> {
        // Check if client exists
        const existing = await clientsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Client not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const client = await clientsRepository.update(id, tenantId, data);
        const dto = toClientResponseDto(client);

        eventBus.emit('client.updated', {
            tenantId,
            clientId: dto.id,
            clientName: dto.clientName,
            updatedFields: Object.keys(data),
        });

        // Timeline: log update
        activityLogger.log({
            tenantId, entityType: 'Client', entityId: dto.id,
            action: 'UPDATE', module: 'clients',
            description: `Updated client "${dto.clientName}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    /**
     * Delete client
     */
    async delete(id: string, tenantId: string): Promise<void> {
        const existing = await clientsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Client not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const clientName = (existing as any).clientName || '';

        // Lifecycle: mark client as churned before deletion
        await clientLifecycleService.progressTo(id, tenantId, 'CHURNED');

        await clientsRepository.delete(id, tenantId);

        eventBus.emit('client.deleted', {
            tenantId,
            clientId: id,
            clientName,
        });

        // Timeline: log deletion
        activityLogger.log({
            tenantId, entityType: 'Client', entityId: id,
            action: 'DELETE', module: 'clients',
            description: `Deleted client "${clientName}"`,
        });
    }
}

export const clientsService = new ClientsService();
