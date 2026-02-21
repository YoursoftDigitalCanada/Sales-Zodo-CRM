"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksManager = exports.TasksManager = void 0;
const tasks_service_1 = require("./tasks.service");
class TasksManager {
    async createTask(req, tenantId, data, createdById) {
        const task = await tasks_service_1.tasksService.create(tenantId, data, createdById);
        // TODO: Add audit logging
        return task;
    }
    async updateTask(req, id, tenantId, data) {
        const task = await tasks_service_1.tasksService.update(id, tenantId, data);
        // TODO: Add audit logging
        return task;
    }
    async deleteTask(req, id, tenantId) {
        await tasks_service_1.tasksService.delete(id, tenantId);
        // TODO: Add audit logging
    }
    async updateTaskStatus(req, id, tenantId, status) {
        const task = await tasks_service_1.tasksService.updateStatus(id, tenantId, status);
        // TODO: Add audit logging
        return task;
    }
    async assignTask(req, id, tenantId, assignedToId) {
        const task = await tasks_service_1.tasksService.assign(id, tenantId, assignedToId);
        // TODO: Add audit logging
        return task;
    }
}
exports.TasksManager = TasksManager;
exports.tasksManager = new TasksManager();
//# sourceMappingURL=tasks.manager.js.map