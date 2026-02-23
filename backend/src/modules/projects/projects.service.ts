import { projectsRepository } from './projects.repository';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto, toProjectResponseDto } from './projects.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { activityLogger } from '../../common/services/activity-logger.service';

/**
 * Maps the validated request body (from the validator schema) to the
 * CreateProjectDto / UpdateProjectDto that the repository understands.
 * This bridges the naming gap between the API contract and the Prisma model.
 */

/** Map frontend status names → Prisma ProjectStatus enum values */
const STATUS_MAP: Record<string, string> = {
    NOT_STARTED: 'PLANNING',
    IN_PROGRESS: 'ACTIVE',
    PLANNING: 'PLANNING',
    ACTIVE: 'ACTIVE',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ARCHIVED: 'ARCHIVED',
};

function mapBodyToDto(body: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = { ...body };

    // projectTitle → name
    if (mapped.projectTitle !== undefined) {
        mapped.name = mapped.projectTitle;
        delete mapped.projectTitle;
    }

    // dueDate → endDate
    if (mapped.dueDate !== undefined) {
        mapped.endDate = mapped.dueDate;
        delete mapped.dueDate;
    }

    // progressPercentage → progress
    if (mapped.progressPercentage !== undefined) {
        mapped.progress = mapped.progressPercentage;
        delete mapped.progressPercentage;
    }

    // Map status to valid Prisma enum value
    if (mapped.status) {
        mapped.status = STATUS_MAP[mapped.status] || 'PLANNING';
    }

    // Auto-generate a project code if not supplied
    if (!mapped.code) {
        const prefix = (mapped.name || 'PRJ').substring(0, 3).toUpperCase();
        mapped.code = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    }

    // Strip fields the repository doesn't handle (stored as-is or ignored)
    // These prevent Prisma errors for unknown columns
    delete mapped.priority;
    delete mapped.category;
    delete mapped.estimatedHours;
    delete mapped.tags;
    delete mapped.milestones;
    delete mapped.attachments;
    delete mapped.notifyTeamMembers;
    delete mapped.projectManagerId;

    return mapped;
}

export class ProjectsService {
    async create(tenantId: string, data: any, createdByUserId?: string) {
        const dto = mapBodyToDto(data) as CreateProjectDto;
        const project = await projectsRepository.create(tenantId, dto);
        const responseDto = toProjectResponseDto(project);

        // Domain event: project created
        eventBus.emit('project.created', {
            tenantId,
            projectId: responseDto.id,
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
            tenantId, entityType: 'Project', entityId: responseDto.id,
            action: 'CREATE', module: 'projects',
            description: `Created project "${(project as any).name || responseDto.id}"`,
            userId: createdByUserId,
            metadata: { projectName: (project as any).name, clientId },
        });

        return responseDto;
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

    async update(id: string, tenantId: string, data: any) {
        const existing = await projectsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const dto = mapBodyToDto(data) as UpdateProjectDto;
        const project = await projectsRepository.update(id, tenantId, dto);
        const responseDto = toProjectResponseDto(project);

        // Detect status change and emit event
        const oldStatus = (existing as any).status;
        const newStatus = (project as any).status;
        if (oldStatus && newStatus && oldStatus !== newStatus) {
            eventBus.emit('project.statusChanged', {
                tenantId,
                projectId: responseDto.id,
                projectName: (project as any).name || responseDto.id,
                previousStatus: oldStatus,
                newStatus,
                clientId: (project as any).clientId || (project as any).client?.id,
            });
        }

        activityLogger.log({
            tenantId, entityType: 'Project', entityId: responseDto.id,
            action: 'UPDATE', module: 'projects',
            description: `Updated project "${(project as any).name || responseDto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return responseDto;
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
