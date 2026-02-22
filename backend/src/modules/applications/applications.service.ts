import { applicationsRepository } from './applications.repository';
import {
    CreateApplicationDto,
    UpdateApplicationDto,
    ApplicationQueryDto,
    toApplicationResponseDto,
} from './applications.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

export class ApplicationsService {
    async create(tenantId: string, data: CreateApplicationDto) {
        const application = await applicationsRepository.create(tenantId, data);
        const dto = toApplicationResponseDto(application);

        activityLogger.log({
            tenantId, entityType: 'Application', entityId: dto.id,
            action: 'CREATE', module: 'applications',
            description: `New application submitted`,
            metadata: { candidateId: (application as any).candidateId, jobId: (application as any).jobId },
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const application = await applicationsRepository.findById(id, tenantId);
        if (!application) {
            throw new NotFoundError('Application not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return toApplicationResponseDto(application);
    }

    async getMany(tenantId: string, query: ApplicationQueryDto) {
        const { data, total } = await applicationsRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map(toApplicationResponseDto),
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

    async update(id: string, tenantId: string, data: UpdateApplicationDto) {
        const existing = await applicationsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Application not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const application = await applicationsRepository.update(id, tenantId, data);
        const dto = toApplicationResponseDto(application);

        // Detect status changes for richer logging
        const oldStatus = (existing as any).status;
        const newStatus = (application as any).status;
        const isStatusChange = oldStatus && newStatus && oldStatus !== newStatus;

        activityLogger.log({
            tenantId, entityType: 'Application', entityId: dto.id,
            action: isStatusChange ? 'STATUS_CHANGE' : 'UPDATE',
            module: 'applications',
            description: isStatusChange
                ? `Application status changed from ${oldStatus} to ${newStatus}`
                : `Updated application`,
            metadata: isStatusChange
                ? { oldStatus, newStatus }
                : { updatedFields: Object.keys(data) },
        });

        if (isStatusChange) {
            eventBus.emit('application.statusChanged', {
                tenantId,
                applicationId: dto.id,
                oldStatus,
                newStatus,
                candidateId: (application as any).candidateId || undefined,
                jobId: (application as any).jobId || undefined,
            });
        }

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await applicationsRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Application not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        activityLogger.log({
            tenantId, entityType: 'Application', entityId: id,
            action: 'DELETE', module: 'applications',
            description: `Deleted application`,
        });

        await applicationsRepository.delete(id, tenantId);
    }
}

export const applicationsService = new ApplicationsService();
