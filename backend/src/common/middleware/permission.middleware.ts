import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import { logger } from '../utils/logger';
import { hasPermissionWithAliases } from '../constants/permission-aliases';

function isOwnerOrAdmin(req: Request): boolean {
  const roleName = req.employee?.role?.name;
  return roleName === 'Owner' || roleName === 'Admin';
}

/**
 * Permission check middleware factory
 * Checks if user has the required permission
 */
export function requirePermission(permissionCode: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const permissions = req.permissions || [];

      if (!hasPermissionWithAliases(permissions, permissionCode) && !isOwnerOrAdmin(req)) {
        logger.warn('Permission denied', {
          userId: req.user?.userId,
          required: permissionCode,
          has: permissions,
        });

        throw new ForbiddenError(
          `You do not have permission to perform this action. Required: ${permissionCode}`,
          ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has ANY of the specified permissions
 */
export function requireAnyPermission(permissionCodes: string[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const permissions = req.permissions || [];

      const hasPermission = isOwnerOrAdmin(req) || permissionCodes.some((code) =>
        hasPermissionWithAliases(permissions, code)
      );

      if (!hasPermission) {
        logger.warn('Permission denied (any)', {
          userId: req.user?.userId,
          required: permissionCodes,
          has: permissions,
        });

        throw new ForbiddenError(
          `You do not have permission to perform this action. Required any of: ${permissionCodes.join(', ')}`,
          ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has ALL of the specified permissions
 */
export function requireAllPermissions(permissionCodes: string[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const permissions = req.permissions || [];

      const hasAllPermissions = isOwnerOrAdmin(req) || permissionCodes.every((code) =>
        hasPermissionWithAliases(permissions, code)
      );

      if (!hasAllPermissions) {
        const missing = permissionCodes.filter(
          (code) => !hasPermissionWithAliases(permissions, code)
        );

        logger.warn('Permission denied (all)', {
          userId: req.user?.userId,
          required: permissionCodes,
          missing,
          has: permissions,
        });

        throw new ForbiddenError(
          `You do not have all required permissions. Missing: ${missing.join(', ')}`,
          ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Role-based access check
 */
export function requireRole(roleName: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userRole = req.employee?.role?.name;

      if (userRole !== roleName) {
        logger.warn('Role denied', {
          userId: req.user?.userId,
          required: roleName,
          has: userRole,
        });

        throw new ForbiddenError(
          `This action requires the ${roleName} role`,
          ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has any of the specified roles
 */
export function requireAnyRole(roleNames: string[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userRole = req.employee?.role?.name;

      if (!userRole || !roleNames.includes(userRole)) {
        logger.warn('Role denied (any)', {
          userId: req.user?.userId,
          required: roleNames,
          has: userRole,
        });

        throw new ForbiddenError(
          `This action requires one of the following roles: ${roleNames.join(', ')}`,
          ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user is owner or admin
 */
export function requireAdmin() {
  return requireAnyRole(['Owner', 'Admin']);
}

/**
 * Check if user is owner
 */
export function requireOwner() {
  return requireRole('Owner');
}

/**
 * Permission check helper function (not middleware)
 */
export function hasPermission(
  permissions: string[],
  permissionCode: string
): boolean {
  return hasPermissionWithAliases(permissions, permissionCode);
}

/**
 * Check if user can access their own resource or has admin permission
 */
export function requireOwnershipOrPermission(
  permissionCode: string,
  getResourceOwnerId: (req: Request) => Promise<string | null>
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const permissions = req.permissions || [];
      const userId = req.user?.userId;
      const employeeId = req.user?.employeeId;

      // Check if user has the permission
      if (hasPermissionWithAliases(permissions, permissionCode)) {
        return next();
      }

      // Check if user owns the resource
      const ownerId = await getResourceOwnerId(req);

      if (ownerId && (ownerId === userId || ownerId === employeeId)) {
        return next();
      }

      throw new ForbiddenError(
        'You can only access your own resources or need appropriate permissions',
        ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS
      );
    } catch (error) {
      next(error);
    }
  };
}
