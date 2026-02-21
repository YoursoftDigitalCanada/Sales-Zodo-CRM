"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.loadEmployee = loadEmployee;
exports.authenticateWithEmployee = authenticateWithEmployee;
const jwt_1 = require("../utils/jwt");
const HttpErrors_1 = require("../errors/HttpErrors");
const errorCodes_1 = require("../errors/errorCodes");
const database_1 = require("../../config/database");
const logger_1 = require("../utils/logger");
/**
 * Authentication middleware
 * Verifies JWT access token and attaches user info to request
 */
async function authenticate(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new HttpErrors_1.UnauthorizedError('No authorization header provided', errorCodes_1.ErrorCodes.AUTH_TOKEN_INVALID);
        }
        // Check Bearer format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            throw new HttpErrors_1.UnauthorizedError('Invalid authorization header format. Use: Bearer <token>', errorCodes_1.ErrorCodes.AUTH_TOKEN_INVALID);
        }
        const token = parts[1];
        // Verify token
        let decoded;
        try {
            decoded = (0, jwt_1.verifyAccessToken)(token);
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new HttpErrors_1.UnauthorizedError('Access token has expired', errorCodes_1.ErrorCodes.AUTH_TOKEN_EXPIRED);
            }
            throw new HttpErrors_1.UnauthorizedError('Invalid access token', errorCodes_1.ErrorCodes.AUTH_TOKEN_INVALID);
        }
        // Verify token type
        if (decoded.type !== 'access') {
            throw new HttpErrors_1.UnauthorizedError('Invalid token type', errorCodes_1.ErrorCodes.AUTH_TOKEN_INVALID);
        }
        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            tenantId: decoded.tenantId,
            employeeId: decoded.employeeId,
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Optional authentication middleware
 * Does not fail if no token provided, but validates if present
 */
async function optionalAuthenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next();
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return next();
        }
        const token = parts[1];
        try {
            const decoded = (0, jwt_1.verifyAccessToken)(token);
            if (decoded.type === 'access') {
                req.user = {
                    userId: decoded.userId,
                    email: decoded.email,
                    tenantId: decoded.tenantId,
                    employeeId: decoded.employeeId,
                };
            }
        }
        catch (error) {
            // Token invalid but optional, continue without user
            logger_1.logger.debug('Optional auth token invalid', { error });
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Load full employee data with permissions
 * Must be used after authenticate middleware
 */
async function loadEmployee(req, res, next) {
    try {
        if (!req.user?.employeeId || !req.user?.tenantId) {
            throw new HttpErrors_1.UnauthorizedError('Employee context not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
        }
        const employee = await database_1.prisma.employee.findUnique({
            where: { id: req.user.employeeId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
                tenant: true,
                user: true,
            },
        });
        if (!employee) {
            throw new HttpErrors_1.UnauthorizedError('Employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
        }
        if (!employee.isActive) {
            throw new HttpErrors_1.UnauthorizedError('Employee account is inactive', errorCodes_1.ErrorCodes.AUTH_USER_INACTIVE);
        }
        // Attach employee and permissions to request
        req.employee = employee;
        req.tenant = employee.tenant;
        req.permissions = employee.role.permissions.map((rp) => rp.permission.code);
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Combined middleware: authenticate + loadEmployee
 */
async function authenticateWithEmployee(req, res, next) {
    await authenticate(req, res, async (err) => {
        if (err)
            return next(err);
        await loadEmployee(req, res, next);
    });
}
//# sourceMappingURL=auth.middleware.js.map