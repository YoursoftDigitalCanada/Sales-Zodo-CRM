"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksService = exports.TasksService = void 0;
const tasks_repository_1 = require("./tasks.repository");
const tasks_dto_1 = require("./tasks.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class TasksService {
    async create(tenantId, data, createdById) {
        if (data.assignedToId) {
            const exists = await tasks_repository_1.tasksRepository.employeeExists(data.assignedToId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Assigned employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }
        if (data.projectId) {
            const exists = await tasks_repository_1.tasksRepository.projectExists(data.projectId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Project not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }
        const task = await tasks_repository_1.tasksRepository.create(tenantId, data, createdById);
        return (0, tasks_dto_1.toTaskResponseDto)(task);
    }
    async getById(id, tenantId) {
        const task = await tasks_repository_1.tasksRepository.findById(id, tenantId);
        if (!task) {
            throw new HttpErrors_1.NotFoundError('Task not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return (0, tasks_dto_1.toTaskResponseDto)(task);
    }
    async getMany(tenantId, query) {
        const { data, total } = await tasks_repository_1.tasksRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const totalPages = Math.ceil(total / limit);
        return {
            data: data.map(tasks_dto_1.toTaskResponseDto),
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
    async update(id, tenantId, data) {
        const existing = await tasks_repository_1.tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Task not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        if (data.assignedToId) {
            const exists = await tasks_repository_1.tasksRepository.employeeExists(data.assignedToId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Assigned employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }
        if (data.projectId) {
            const exists = await tasks_repository_1.tasksRepository.projectExists(data.projectId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Project not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }
        const task = await tasks_repository_1.tasksRepository.update(id, tenantId, data);
        return (0, tasks_dto_1.toTaskResponseDto)(task);
    }
    async delete(id, tenantId) {
        const existing = await tasks_repository_1.tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Task not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        await tasks_repository_1.tasksRepository.delete(id, tenantId);
    }
    async updateStatus(id, tenantId, status) {
        const existing = await tasks_repository_1.tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Task not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        const task = await tasks_repository_1.tasksRepository.updateStatus(id, tenantId, status);
        return (0, tasks_dto_1.toTaskResponseDto)(task);
    }
    async assign(id, tenantId, assignedToId) {
        const existing = await tasks_repository_1.tasksRepository.findById(id, tenantId);
        if (!existing) {
            throw new HttpErrors_1.NotFoundError('Task not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        }
        if (assignedToId) {
            const exists = await tasks_repository_1.tasksRepository.employeeExists(assignedToId, tenantId);
            if (!exists) {
                throw new HttpErrors_1.BadRequestError('Assigned employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
            }
        }
        const task = await tasks_repository_1.tasksRepository.assign(id, tenantId, assignedToId);
        return (0, tasks_dto_1.toTaskResponseDto)(task);
    }
    async getKanban(tenantId, filters) {
        const kanban = await tasks_repository_1.tasksRepository.getKanban(tenantId, filters);
        return kanban.map((col) => ({
            status: col.status,
            tasks: col.tasks.map(tasks_dto_1.toTaskResponseDto),
            count: col.count,
        }));
    }
    async getStatistics(tenantId) {
        return tasks_repository_1.tasksRepository.getStatistics(tenantId);
    }
}
exports.TasksService = TasksService;
exports.tasksService = new TasksService();
//# sourceMappingURL=tasks.service.js.map