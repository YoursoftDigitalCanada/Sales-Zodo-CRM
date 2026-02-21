"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
exports.requireAllPermissions = requireAllPermissions;
exports.requireRole = requireRole;
exports.requireAnyRole = requireAnyRole;
exports.requireAdmin = requireAdmin;
exports.requireOwner = requireOwner;
exports.hasPermission = hasPermission;
exports.requireOwnershipOrPermission = requireOwnershipOrPermission;
const HttpErrors_1 = require("../errors/HttpErrors");
const errorCodes_1 = require("../errors/errorCodes");
const logger_1 = require("../utils/logger");
/**
 * Permission check middleware factory
 * Checks if user has the required permission
 */
function requirePermission(permissionCode) {
    return async (req, res, next) => {
        try {
            const permissions = req.permissions || [];
            if (!permissions.includes(permissionCode)) {
                logger_1.logger.warn('Permission denied', {
                    userId: req.user?.userId,
                    required: permissionCode,
                    has: permissions,
                });
                throw new HttpErrors_1.ForbiddenError(`You do not have permission to perform this action. Required: ${permissionCode}`, errorCodes_1.ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
/**
 * Check if user has ANY of the specified permissions
 */
function requireAnyPermission(permissionCodes) {
    return async (req, res, next) => {
        try {
            const permissions = req.permissions || [];
            const hasPermission = permissionCodes.some((code) => permissions.includes(code));
            if (!hasPermission) {
                logger_1.logger.warn('Permission denied (any)', {
                    userId: req.user?.userId,
                    required: permissionCodes,
                    has: permissions,
                });
                throw new HttpErrors_1.ForbiddenError(`You do not have permission to perform this action. Required any of: ${permissionCodes.join(', ')}`, errorCodes_1.ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
/**
 * Check if user has ALL of the specified permissions
 */
function requireAllPermissions(permissionCodes) {
    return async (req, res, next) => {
        try {
            const permissions = req.permissions || [];
            const hasAllPermissions = permissionCodes.every((code) => permissions.includes(code));
            if (!hasAllPermissions) {
                const missing = permissionCodes.filter((code) => !permissions.includes(code));
                logger_1.logger.warn('Permission denied (all)', {
                    userId: req.user?.userId,
                    required: permissionCodes,
                    missing,
                    has: permissions,
                });
                throw new HttpErrors_1.ForbiddenError(`You do not have all required permissions. Missing: ${missing.join(', ')}`, errorCodes_1.ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
/**
 * Role-based access check
 */
function requireRole(roleName) {
    return async (req, res, next) => {
        try {
            const userRole = req.employee?.role?.name;
            if (userRole !== roleName) {
                logger_1.logger.warn('Role denied', {
                    userId: req.user?.userId,
                    required: roleName,
                    has: userRole,
                });
                throw new HttpErrors_1.ForbiddenError(`This action requires the ${roleName} role`, errorCodes_1.ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
/**
 * Check if user has any of the specified roles
 */
function requireAnyRole(roleNames) {
    return async (req, res, next) => {
        try {
            const userRole = req.employee?.role?.name;
            if (!userRole || !roleNames.includes(userRole)) {
                logger_1.logger.warn('Role denied (any)', {
                    userId: req.user?.userId,
                    required: roleNames,
                    has: userRole,
                });
                throw new HttpErrors_1.ForbiddenError(`This action requires one of the following roles: ${roleNames.join(', ')}`, errorCodes_1.ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
/**
 * Check if user is owner or admin
 */
function requireAdmin() {
    return requireAnyRole(['Owner', 'Admin']);
}
/**
 * Check if user is owner
 */
function requireOwner() {
    return requireRole('Owner');
}
/**
 * Permission check helper function (not middleware)
 */
function hasPermission(permissions, permissionCode) {
    return permissions.includes(permissionCode);
}
/**
 * Check if user can access their own resource or has admin permission
 */
function requireOwnershipOrPermission(permissionCode, getResourceOwnerId) {
    return async (req, res, next) => {
        try {
            const permissions = req.permissions || [];
            const userId = req.user?.userId;
            const employeeId = req.user?.employeeId;
            // Check if user has the permission
            if (permissions.includes(permissionCode)) {
                return next();
            }
            // Check if user owns the resource
            const ownerId = await getResourceOwnerId(req);
            if (ownerId && (ownerId === userId || ownerId === employeeId)) {
                return next();
            }
            throw new HttpErrors_1.ForbiddenError('You can only access your own resources or need appropriate permissions', errorCodes_1.ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS);
        }
        catch (error) {
            next(error);
        }
    };
}
//# sourceMappingURL=permission.middleware.js.map