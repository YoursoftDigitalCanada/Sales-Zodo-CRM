"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsService = exports.ProjectsService = void 0;
const projects_repository_1 = require("./projects.repository");
const projects_dto_1 = require("./projects.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class ProjectsService {
    async create(tenantId, data) {
        const project = await projects_repository_1.projectsRepository.create(tenantId, data);
        return (0, projects_dto_1.toProjectResponseDto)(project);
    }
    async getById(id, tenantId) {
        const project = await projects_repository_1.projectsRepository.findById(id, tenantId);
        if (!project)
            throw new HttpErrors_1.NotFoundError('Project not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, projects_dto_1.toProjectResponseDto)(project);
    }
    async getMany(tenantId, query) {
        const { data, total } = await projects_repository_1.projectsRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(projects_dto_1.toProjectResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await projects_repository_1.projectsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Project not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const project = await projects_repository_1.projectsRepository.update(id, data);
        return (0, projects_dto_1.toProjectResponseDto)(project);
    }
    async delete(id, tenantId) {
        const existing = await projects_repository_1.projectsRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Project not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await projects_repository_1.projectsRepository.delete(id);
    }
}
exports.ProjectsService = ProjectsService;
exports.projectsService = new ProjectsService();
//# sourceMappingURL=projects.service.js.map