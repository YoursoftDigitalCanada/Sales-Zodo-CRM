import { projectsRepository } from './projects.repository';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto, toProjectResponseDto } from './projects.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { activityLogger } from '../../common/services/activity-logger.service';

export class ProjectsService {
    async create(tenantId: string, data: CreateProjectDto, createdByUserId?: string) {
        const project = await projectsRepository.create(tenantId, data);
        const dto = toProjectResponseDto(project);

        // Domain event: project created
        eventBus.emit('project.created', {
            tenantId,
            projectId: dto.id,
            projectName: (project as any).name,
            clientId: (project as any).clientId || (project as any).client?.id,
            assignedToUserId: createdByUserId,
        });

        // Lifecycle: client with active project → ACTIVE
        const clientId = (project as any).clientId || (project as any).client?.id;
        if (clientId) {
            await clientLifecycleService.progressTo(clientId, tenantId, 'ACTIVE');
            await clientLifecycleService.reinforceEngagement(clientId, tenantId);
        }

        activityLogger.log({
            tenantId, entityType: 'Project', entityId: dto.id,
            action: 'CREATE', module: 'projects',
            description: `Created project "${(project as any).name || dto.id}"`,
            userId: createdByUserId,
            metadata: { projectName: (project as any).name, clientId },
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const project = await projectsRepository.findById(id, tenantId);
        if (!project) throw new NotFoundError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toProjectResponseDto(project);
    }

    async getMany(tenantId: string, query: ProjectQueryDto) {
        const { data, total } = await projectsRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toProjectResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateProjectDto) {
        const existing = await projectsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const project = await projectsRepository.update(id, tenantId, data);
        const dto = toProjectResponseDto(project);

        activityLogger.log({
            tenantId, entityType: 'Project', entityId: dto.id,
            action: 'UPDATE', module: 'projects',
            description: `Updated project "${(project as any).name || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await projectsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Project', entityId: id,
            action: 'DELETE', module: 'projects',
            description: `Deleted project "${(existing as any).name || id}"`,
        });

        await projectsRepository.delete(id, tenantId);
    }
}

export const projectsService = new ProjectsService();
