import { permissionsRepository } from './permissions.repository';
import { toPermissionResponseDto } from './permissions.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class PermissionsService {
    async getAll() {
        const permissions = await permissionsRepository.findAll();
        return permissions.map(toPermissionResponseDto);
    }

    async getByModule(module: string) {
        const permissions = await permissionsRepository.findByModule(module);
        return permissions.map(toPermissionResponseDto);
    }

    async getAllModules() {
        return permissionsRepository.getAllModules();
    }

    async getRolePermissions(roleId: string, tenantId: string) {
        const permissions = await permissionsRepository.findRolePermissions(roleId, tenantId);
        if (!permissions) {
            throw new NotFoundError('Role not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return permissions.map(toPermissionResponseDto);
    }

    async assignPermissionsToRole(roleId: string, tenantId: string, permissionIds: string[]) {
        // Validate all permission IDs exist
        if (permissionIds.length > 0) {
            const found = await permissionsRepository.findByIds(permissionIds);
            if (found.length !== permissionIds.length) {
                throw new NotFoundError('One or more permissions not found', ErrorCodes.RESOURCE_NOT_FOUND);
            }
        }

        const permissions = await permissionsRepository.syncRolePermissions(roleId, tenantId, permissionIds);
        if (!permissions) {
            throw new NotFoundError('Role not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }
        return permissions.map(toPermissionResponseDto);
    }
}

export const permissionsService = new PermissionsService();
