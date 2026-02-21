import { rolesRepository } from './roles.repository';
import { CreateRoleDto, UpdateRoleDto, RoleQueryDto, toRoleResponseDto } from './roles.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class RolesService {
    async create(tenantId: string, data: CreateRoleDto) {
        const role = await rolesRepository.create(tenantId, data);
        return toRoleResponseDto(role);
    }

    async getById(id: string, tenantId: string) {
        const role = await rolesRepository.findById(id, tenantId);
        if (!role) throw new NotFoundError('Role not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toRoleResponseDto(role);
    }

    async getMany(tenantId: string, query: RoleQueryDto) {
        const { data, total } = await rolesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toRoleResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateRoleDto) {
        const existing = await rolesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Role not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const role = await rolesRepository.update(id, data);
        return toRoleResponseDto(role);
    }

    async delete(id: string, tenantId: string) {
        const existing = await rolesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Role not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await rolesRepository.delete(id);
    }
}

export const rolesService = new RolesService();
