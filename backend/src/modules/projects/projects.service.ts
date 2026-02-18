import { projectsRepository } from './projects.repository';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto, toProjectResponseDto } from './projects.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class ProjectsService {
    async create(tenantId: string, data: CreateProjectDto) {
        const project = await projectsRepository.create(tenantId, data);
        return toProjectResponseDto(project);
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
        const project = await projectsRepository.update(id, data);
        return toProjectResponseDto(project);
    }

    async delete(id: string, tenantId: string) {
        const existing = await projectsRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Project not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await projectsRepository.delete(id);
    }
}

export const projectsService = new ProjectsService();
