"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksController = exports.TasksController = void 0;
const tasks_service_1 = require("./tasks.service");
const tasks_manager_1 = require("./tasks.manager");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class TasksController {
    async create(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const employeeId = req.user.employeeId;
            const data = req.body;
            const task = await tasks_manager_1.tasksManager.createTask(req, tenantId, data, employeeId);
            (0, responseFormatter_1.sendCreated)(res, task, 'Task created successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getMany(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await tasks_service_1.tasksService.getMany(tenantId, query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (error) {
            next(error);
        }
    }
    async getKanban(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { assignedToId, projectId } = req.query;
            const kanban = await tasks_service_1.tasksService.getKanban(tenantId, { assignedToId, projectId });
            (0, responseFormatter_1.sendSuccess)(res, kanban);
        }
        catch (error) {
            next(error);
        }
    }
    async getStatistics(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const statistics = await tasks_service_1.tasksService.getStatistics(tenantId);
            (0, responseFormatter_1.sendSuccess)(res, statistics);
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const task = await tasks_service_1.tasksService.getById(id, tenantId);
            (0, responseFormatter_1.sendSuccess)(res, task);
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const data = req.body;
            const task = await tasks_manager_1.tasksManager.updateTask(req, id, tenantId, data);
            (0, responseFormatter_1.sendSuccess)(res, task, 'Task updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const { status } = req.body;
            const task = await tasks_manager_1.tasksManager.updateTaskStatus(req, id, tenantId, status);
            (0, responseFormatter_1.sendSuccess)(res, task, 'Task status updated');
        }
        catch (error) {
            next(error);
        }
    }
    async assign(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            const { assignedToId } = req.body;
            const task = await tasks_manager_1.tasksManager.assignTask(req, id, tenantId, assignedToId);
            (0, responseFormatter_1.sendSuccess)(res, task, 'Task assigned successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const tenantId = req.user.tenantId;
            const { id } = req.params;
            await tasks_manager_1.tasksManager.deleteTask(req, id, tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TasksController = TasksController;
exports.tasksController = new TasksController();
//# sourceMappingURL=tasks.controller.js.map