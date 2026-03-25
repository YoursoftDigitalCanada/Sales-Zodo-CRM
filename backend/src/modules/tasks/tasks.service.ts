import { tasksRepository } from './tasks.repository';
import {
    CreateTaskDto,
    UpdateTaskDto,
    TaskQueryDto,
    TaskResponseDto,
    TaskListResponseDto,
    TaskKanbanDto,
    TaskStatisticsDto,
    toTaskResponseDto,
} from './tasks.dto';
import {
    NotFoundError,
    BadRequestError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { TaskStatus } from '@prisma/client';
import { eventBus } from '../../common/events/event-bus';
import { activityLogger } from '../../common/services/activity-logger.service';
import { DataAccessContext } from '../../common/access/data-access';

export class TasksService {
    async create(tenantId: string, data: CreateTaskDto, createdById?: string): Promise<TaskResponseDto> {
        if (data.assignedToId) {
            const exists = await tasksRepository.employeeExists(data.assignedToId, tenantId);
            if (!exists) {
                throw new BadRequestError('Assigned employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }

        if (data.projectId) {
            const exists = await tasksRepository.projectExists(data.projectId, tenantId);
            if (!exists) {
                throw new BadRequestError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }

        const task = await tasksRepository.create(tenantId, data, createdById);
        const dto = toTaskResponseDto(task);

        activityLogger.log({
            tenantId, entityType: 'Task', entityId: dto.id,
            action: 'CREATE', module: 'tasks',
            description: `Created task "${(task as any).title || dto.id}"`,
            userId: createdById,
            metadata: { title: (task as any).title, projectId: data.projectId, assignedToId: data.assignedToId },
        });

        return dto;
    }

    async getById(id: string, tenantId: string): Promise<TaskResponseDto> {
        const task = await tasksRepository.findById(id, tenantId);
        if (!task) {
            throw new NotFoundError('Task not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return toTaskResponseDto(task);
    }

    async getMany(tenantId: string, query: TaskQueryDto, dataAccess?: DataAccessContext): Promise<TaskListResponseDto> {
        const { data, total } = await tasksRepository.findMany(tenantId, query, dataAccess);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map(toTaskResponseDto),
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

    async update(id: string, tenantId: string, data: UpdateTaskDto): Promise<TaskResponseDto> {
        const existing = await tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Task not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        if (data.assignedToId) {
            const exists = await tasksRepository.employeeExists(data.assignedToId, tenantId);
            if (!exists) {
                throw new BadRequestError('Assigned employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }

        if (data.projectId) {
            const exists = await tasksRepository.projectExists(data.projectId, tenantId);
            if (!exists) {
                throw new BadRequestError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }

        const task = await tasksRepository.update(id, tenantId, data);
        const dto = toTaskResponseDto(task);

        activityLogger.log({
            tenantId, entityType: 'Task', entityId: dto.id,
            action: 'UPDATE', module: 'tasks',
            description: `Updated task "${(task as any).title || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string): Promise<void> {
        const existing = await tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Task not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        activityLogger.log({
            tenantId, entityType: 'Task', entityId: id,
            action: 'DELETE', module: 'tasks',
            description: `Deleted task "${(existing as any).title || id}"`,
        });

        await tasksRepository.delete(id, tenantId);
    }

    async updateStatus(id: string, tenantId: string, status: TaskStatus, actorUserId?: string): Promise<TaskResponseDto> {
        const existing = await tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Task not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const oldStatus = (existing as any).status || '';
        const task = await tasksRepository.updateStatus(id, tenantId, status);
        const dto = toTaskResponseDto(task);

        // Domain event: task completed
        if (status === 'DONE') {
            eventBus.emit('task.completed', {
                tenantId,
                taskId: id,
                taskTitle: (task as any)?.title || '',
                completedByUserId: actorUserId || '',
            });
        }

        activityLogger.log({
            tenantId, entityType: 'Task', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'tasks',
            description: `Task "${(task as any).title || dto.id}" status changed to ${status}`,
            userId: actorUserId,
            metadata: { oldStatus, newStatus: status },
        });

        return dto;
    }

    async assign(id: string, tenantId: string, assignedToId: string | null): Promise<TaskResponseDto> {
        const existing = await tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Task not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        if (assignedToId) {
            const exists = await tasksRepository.employeeExists(assignedToId, tenantId);
            if (!exists) {
                throw new BadRequestError('Assigned employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }

        const task = await tasksRepository.assign(id, tenantId, assignedToId);
        const dto = toTaskResponseDto(task);

        activityLogger.log({
            tenantId, entityType: 'Task', entityId: dto.id,
            action: 'UPDATE', module: 'tasks',
            description: assignedToId
                ? `Task "${(task as any).title || dto.id}" assigned`
                : `Task "${(task as any).title || dto.id}" unassigned`,
            metadata: { assignedToId },
        });

        return dto;
    }

    async getKanban(tenantId: string, filters?: { assignedToId?: string; projectId?: string }, dataAccess?: DataAccessContext): Promise<TaskKanbanDto[]> {
        const kanban = await tasksRepository.getKanban(tenantId, filters, dataAccess);
        return kanban.map((col) => ({
            status: col.status,
            tasks: col.tasks.map(toTaskResponseDto),
            count: col.count,
        }));
    }

    async getStatistics(tenantId: string, dataAccess?: DataAccessContext): Promise<TaskStatisticsDto> {
        return tasksRepository.getStatistics(tenantId, dataAccess);
    }
}

export const tasksService = new TasksService();
