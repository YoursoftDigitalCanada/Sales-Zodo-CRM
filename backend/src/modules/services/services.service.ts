import { servicesRepository } from './services.repository';
import { CreateServiceDto, UpdateServiceDto, ServiceQueryDto, toServiceResponseDto } from './services.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { activityLogger } from '../../common/services/activity-logger.service';

export class ServicesService {
    async create(tenantId: string, data: CreateServiceDto) {
        const service = await servicesRepository.create(tenantId, data);
        const dto = toServiceResponseDto(service);

        eventBus.emit('service.created', {
            tenantId,
            serviceId: dto.id,
            serviceName: dto.name,
            category: dto.category || undefined,
        });

        activityLogger.log({
            tenantId, entityType: 'Service', entityId: dto.id,
            action: 'CREATE', module: 'services',
            description: `Created service "${dto.name}"`,
            metadata: { category: dto.category, basePrice: dto.basePrice },
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const service = await servicesRepository.findById(id, tenantId);
        if (!service) throw new NotFoundError('Service not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toServiceResponseDto(service);
    }

    async getMany(tenantId: string, query: ServiceQueryDto) {
        const { data, total } = await servicesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toServiceResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateServiceDto) {
        const existing = await servicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Service not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const service = await servicesRepository.update(id, tenantId, data);
        const dto = toServiceResponseDto(service);

        eventBus.emit('service.updated', {
            tenantId,
            serviceId: dto.id,
            serviceName: dto.name,
            updatedFields: Object.keys(data),
        });

        activityLogger.log({
            tenantId, entityType: 'Service', entityId: dto.id,
            action: 'UPDATE', module: 'services',
            description: `Updated service "${dto.name}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async deactivate(id: string, tenantId: string) {
        const existing = await servicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Service not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const service = await servicesRepository.deactivate(id, tenantId);
        const dto = toServiceResponseDto(service);

        eventBus.emit('service.deleted', {
            tenantId,
            serviceId: dto.id,
            serviceName: dto.name,
        });

        activityLogger.log({
            tenantId, entityType: 'Service', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'services',
            description: `Deactivated service "${dto.name}"`,
            metadata: { isActive: false },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await servicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Service not found', ErrorCodes.RESOURCE_NOT_FOUND);

        eventBus.emit('service.deleted', {
            tenantId,
            serviceId: id,
            serviceName: existing.name,
        });

        activityLogger.log({
            tenantId, entityType: 'Service', entityId: id,
            action: 'DELETE', module: 'services',
            description: `Deleted service "${existing.name}"`,
        });

        await servicesRepository.delete(id, tenantId);
    }
}

export const servicesService = new ServicesService();
