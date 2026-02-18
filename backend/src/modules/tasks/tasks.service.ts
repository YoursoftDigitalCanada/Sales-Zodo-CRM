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
        return toTaskResponseDto(task);
    }

    async getById(id: string, tenantId: string): Promise<TaskResponseDto> {
        const task = await tasksRepository.findById(id, tenantId);
        if (!task) {
            throw new NotFoundError('Task not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return toTaskResponseDto(task);
    }

    async getMany(tenantId: string, query: TaskQueryDto): Promise<TaskListResponseDto> {
        const { data, total } = await tasksRepository.findMany(tenantId, query);
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
        return toTaskResponseDto(task);
    }

    async delete(id: string, tenantId: string): Promise<void> {
        const existing = await tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Task not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await tasksRepository.delete(id, tenantId);
    }

    async updateStatus(id: string, tenantId: string, status: TaskStatus): Promise<TaskResponseDto> {
        const existing = await tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new NotFoundError('Task not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const task = await tasksRepository.updateStatus(id, tenantId, status);
        return toTaskResponseDto(task);
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
        return toTaskResponseDto(task);
    }

    async getKanban(tenantId: string, filters?: { assignedToId?: string; projectId?: string }): Promise<TaskKanbanDto[]> {
        const kanban = await tasksRepository.getKanban(tenantId, filters);
        return kanban.map((col) => ({
            status: col.status,
            tasks: col.tasks.map(toTaskResponseDto),
            count: col.count,
        }));
    }

    async getStatistics(tenantId: string): Promise<TaskStatisticsDto> {
        return tasksRepository.getStatistics(tenantId);
    }
}

export const tasksService = new TasksService();
