import { prisma } from '../../config/database';
import { PERMISSION_DEFINITIONS } from '../constants/permissions';
import { ROLE_DEFINITIONS, SYSTEM_ROLES } from '../constants/roles';
import { logger } from '../utils/logger';

interface PermissionBackfillRule {
  assignToAllRoles?: boolean;
  copyFrom?: string[];
}

const BACKFILL_RULES: Record<string, PermissionBackfillRule> = {
  'tenants.create': { copyFrom: ['tenants.view'] },
  'tenants.delete': { copyFrom: ['tenants.update'] },
  'roof-estimator.update': { copyFrom: ['roof-estimator.create'] },
  'support.view': { assignToAllRoles: true },
  'support.create': { assignToAllRoles: true },
  'support.update': { assignToAllRoles: true },
  'support.delete': { assignToAllRoles: true },
};

export class PermissionSyncService {
  async sync(): Promise<void> {
    const existingPermissions = await prisma.permission.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        module: true,
        action: true,
      },
    });

    const existingByCode = new Map(existingPermissions.map((permission) => [permission.code, permission]));

    const missingPermissions = PERMISSION_DEFINITIONS.filter(
      (definition) => !existingByCode.has(definition.code)
    );

    if (missingPermissions.length > 0) {
      await prisma.permission.createMany({
        data: missingPermissions.map((definition) => ({
          code: definition.code,
          name: definition.name,
          description: definition.description,
          module: definition.module,
          action: definition.action,
        })),
        skipDuplicates: true,
      });
    }

    for (const definition of PERMISSION_DEFINITIONS) {
      const existing = existingByCode.get(definition.code);
      if (!existing) {
        continue;
      }

      if (
        existing.name !== definition.name
        || existing.description !== definition.description
        || existing.module !== definition.module
        || existing.action !== definition.action
      ) {
        await prisma.permission.update({
          where: { code: definition.code },
          data: {
            name: definition.name,
            description: definition.description,
            module: definition.module,
            action: definition.action,
          },
        });
      }
    }

    const allPermissions = await prisma.permission.findMany({
      select: { id: true, code: true },
    });
    const permissionIdByCode = new Map(allPermissions.map((permission) => [permission.code, permission.id]));

    const roles = await prisma.role.findMany({
      select: { id: true, name: true, tenantId: true, isDefault: true },
    });
    const roleIds = roles.map((role) => role.id);

    const rolePermissions = await prisma.rolePermission.findMany({
      where: roleIds.length > 0 ? { roleId: { in: roleIds } } : undefined,
      include: {
        permission: {
          select: { code: true },
        },
      },
    });

    const permissionCodesByRoleId = new Map<string, Set<string>>();
    for (const role of roles) {
      permissionCodesByRoleId.set(role.id, new Set<string>());
    }
    for (const rolePermission of rolePermissions) {
      const current = permissionCodesByRoleId.get(rolePermission.roleId) || new Set<string>();
      current.add(rolePermission.permission.code);
      permissionCodesByRoleId.set(rolePermission.roleId, current);
    }

    let backfilledAssignments = 0;

    for (const [targetCode, rule] of Object.entries(BACKFILL_RULES)) {
      const targetPermissionId = permissionIdByCode.get(targetCode);
      if (!targetPermissionId) {
        continue;
      }

      const targetRoleIds = new Set<string>();

      if (rule.assignToAllRoles) {
        roleIds.forEach((roleId) => targetRoleIds.add(roleId));
      }

      if (rule.copyFrom && rule.copyFrom.length > 0) {
        for (const roleId of roleIds) {
          const currentCodes = permissionCodesByRoleId.get(roleId);
          if (!currentCodes) {
            continue;
          }

          if (rule.copyFrom.some((code) => currentCodes.has(code))) {
            targetRoleIds.add(roleId);
          }
        }
      }

      const rowsToInsert = Array.from(targetRoleIds)
        .filter((roleId) => !permissionCodesByRoleId.get(roleId)?.has(targetCode))
        .map((roleId) => ({ roleId, permissionId: targetPermissionId }));

      if (rowsToInsert.length === 0) {
        continue;
      }

      await prisma.rolePermission.createMany({
        data: rowsToInsert,
        skipDuplicates: true,
      });

      for (const { roleId } of rowsToInsert) {
        const currentCodes = permissionCodesByRoleId.get(roleId) || new Set<string>();
        currentCodes.add(targetCode);
        permissionCodesByRoleId.set(roleId, currentCodes);
      }

      backfilledAssignments += rowsToInsert.length;
    }

    const permissionCodesByRoleName = new Map<string, string[]>(
      ROLE_DEFINITIONS.map((definition) => [definition.name, definition.permissions]),
    );
    permissionCodesByRoleName.set('Staff', permissionCodesByRoleName.get(SYSTEM_ROLES.EMPLOYEE) || []);

    let baselineAssignments = 0;

    for (const role of roles) {
      const expectedCodes = permissionCodesByRoleName.get(role.name);
      if (!expectedCodes || expectedCodes.length === 0) {
        continue;
      }

      const currentCodes = permissionCodesByRoleId.get(role.id) || new Set<string>();
      const missingPermissionIds = expectedCodes
        .filter((code) => !currentCodes.has(code))
        .map((code) => permissionIdByCode.get(code))
        .filter((permissionId): permissionId is string => Boolean(permissionId));

      if (missingPermissionIds.length === 0) {
        continue;
      }

      await prisma.rolePermission.createMany({
        data: missingPermissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });

      missingPermissionIds.forEach((permissionId) => {
        const permissionCode = allPermissions.find((permission) => permission.id === permissionId)?.code;
        if (permissionCode) {
          currentCodes.add(permissionCode);
        }
      });
      permissionCodesByRoleId.set(role.id, currentCodes);
      baselineAssignments += missingPermissionIds.length;
    }

    logger.info('[PermissionSync] Permission catalog synchronized', {
      definitions: PERMISSION_DEFINITIONS.length,
      createdPermissions: missingPermissions.length,
      backfilledAssignments,
      baselineAssignments,
    });
  }
}

export const permissionSyncService = new PermissionSyncService();
