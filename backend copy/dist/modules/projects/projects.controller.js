"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsController = exports.ProjectsController = void 0;
const projects_service_1 = require("./projects.service");
const responseFormatter_1 = require("../../common/utils/responseFormatter");
class ProjectsController {
    async create(req, res, next) {
        try {
            const project = await projects_service_1.projectsService.create(req.user.tenantId, req.body);
            (0, responseFormatter_1.sendCreated)(res, project, 'Project created');
        }
        catch (e) {
            next(e);
        }
    }
    async getMany(req, res, next) {
        try {
            const result = await projects_service_1.projectsService.getMany(req.user.tenantId, req.query);
            (0, responseFormatter_1.sendSuccess)(res, result.data, undefined, 200, result.meta);
        }
        catch (e) {
            next(e);
        }
    }
    async getById(req, res, next) {
        try {
            const project = await projects_service_1.projectsService.getById(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendSuccess)(res, project);
        }
        catch (e) {
            next(e);
        }
    }
    async update(req, res, next) {
        try {
            const project = await projects_service_1.projectsService.update(req.params.id, req.user.tenantId, req.body);
            (0, responseFormatter_1.sendSuccess)(res, project, 'Project updated');
        }
        catch (e) {
            next(e);
        }
    }
    async delete(req, res, next) {
        try {
            await projects_service_1.projectsService.delete(req.params.id, req.user.tenantId);
            (0, responseFormatter_1.sendNoContent)(res);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.ProjectsController = ProjectsController;
exports.projectsController = new ProjectsController();
//# sourceMappingURL=projects.controller.js.map