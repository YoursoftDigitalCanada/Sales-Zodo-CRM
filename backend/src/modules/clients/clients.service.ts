import { clientsRepository } from './clients.repository';
import {
    CreateClientDto,
    UpdateClientDto,
    ClientQueryDto,
    ClientResponseDto,
    stripLegacyClientFields,
    toClientResponseDto,
} from './clients.dto';
import {
    BadRequestError,
    NotFoundError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { activityLogger } from '../../common/services/activity-logger.service';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { prisma } from '../../config/database';
import { DataAccessContext } from '../../common/access/data-access';

export class ClientsService {
    private async validateAssignedOwner(tenantId: string, assignedOwner?: string | null): Promise<void> {
        if (!assignedOwner) return;
        const employee = await prisma.employee.findFirst({
            where: { id: assignedOwner, tenantId, isActive: true },
            select: { id: true },
        });
        if (!employee) {
            throw new BadRequestError('Assigned owner does not belong to this tenant', ErrorCodes.INVALID_INPUT);
        }
    }

    /**
     * Create a new client
     */
    async create(tenantId: string, data: CreateClientDto, createdByUserId?: string): Promise<ClientResponseDto> {
        const cleanData = stripLegacyClientFields(data) as unknown as CreateClientDto;
        await this.validateAssignedOwner(tenantId, cleanData.assignedOwner);

        const client = await clientsRepository.create(tenantId, cleanData);
        const dto = toClientResponseDto(client);

        // Auto-create primary contact if contactName is provided
        if (cleanData.contactName && cleanData.contactName.trim()) {
            try {
                await prisma.contact.create({
                    data: {
                        tenantId,
                        companyId: client.id,
                        contactName: cleanData.contactName.trim(),
                        email: (client as any).primaryEmail || '',
                        jobTitle: cleanData.position || null,
                        officePhone: cleanData.directPhone || null,
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
            description: `Created organization "${dto.clientName}"`,
            userId: createdByUserId,
            metadata: { clientName: dto.clientName, clientType: dto.clientType, lifecycleStage: dto.lifecycleStage },
        });

        return dto;
    }

    /**
     * Get client by ID
     */
    async getById(id: string, tenantId: string): Promise<ClientResponseDto> {
        const client = await clientsRepository.findById(id, tenantId);

        if (!client) {
            throw new NotFoundError('Organization not found', ErrorCodes.RESOURCE_NOT_FOUND);
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
        const cleanData = stripLegacyClientFields(data) as unknown as UpdateClientDto;
        await this.validateAssignedOwner(tenantId, cleanData.assignedOwner);

        // Check if client exists
        const existing = await clientsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Organization not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const client = await clientsRepository.update(id, tenantId, cleanData);
        const dto = toClientResponseDto(client);

        eventBus.emit('client.updated', {
            tenantId,
            clientId: dto.id,
            clientName: dto.clientName,
            updatedFields: Object.keys(cleanData),
        });

        // Timeline: log update
        activityLogger.log({
            tenantId, entityType: 'Client', entityId: dto.id,
            action: 'UPDATE', module: 'clients',
            description: `Updated organization "${dto.clientName}"`,
            metadata: { updatedFields: Object.keys(cleanData) },
        });

        return dto;
    }

    /**
     * Delete client
     */
    async delete(id: string, tenantId: string): Promise<void> {
        const existing = await clientsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Organization not found', ErrorCodes.RESOURCE_NOT_FOUND);
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
            description: `Deleted organization "${clientName}"`,
        });
    }
}

export const clientsService = new ClientsService();
