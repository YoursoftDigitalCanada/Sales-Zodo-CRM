import { rolesRepository } from './roles.repository';
import { CreateRoleDto, UpdateRoleDto, RoleQueryDto, toRoleResponseDto } from './roles.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';

export class RolesService {
    async create(tenantId: string, data: CreateRoleDto) {
        const role = await rolesRepository.create(tenantId, data);
        const dto = toRoleResponseDto(role);

        activityLogger.log({
            tenantId, entityType: 'Role', entityId: dto.id,
            action: 'CREATE', module: 'roles',
            description: `Created role "${(role as any).name || dto.id}"`,
            metadata: { roleName: (role as any).name },
        });

        return dto;
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
        const role = await rolesRepository.update(id, tenantId, data);
        const dto = toRoleResponseDto(role);

        activityLogger.log({
            tenantId, entityType: 'Role', entityId: dto.id,
            action: 'UPDATE', module: 'roles',
            description: `Updated role "${(role as any).name || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await rolesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Role not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Role', entityId: id,
            action: 'DELETE', module: 'roles',
            description: `Deleted role "${(existing as any).name || id}"`,
        });

        await rolesRepository.delete(id, tenantId);
    }
}

export const rolesService = new RolesService();
