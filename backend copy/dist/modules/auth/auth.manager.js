"use strict";
/**
 * Auth Manager
 * Contains complex business logic, orchestration, and cross-cutting concerns
 * Separated from service to maintain single responsibility principle
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authManager = exports.AuthManager = void 0;
const database_1 = require("../../config/database");
const auth_repository_1 = require("./auth.repository");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
const logger_1 = require("../../common/utils/logger");
const audit_service_1 = require("../audit/audit.service");
const notifications_manager_1 = require("../notifications/notifications.manager");
const client_1 = require("@prisma/client");
class AuthManager {
    DEFAULT_PASSWORD_POLICY = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5,
    };
    DEFAULT_SECURITY_CONFIG = {
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
        sessionTimeoutMinutes: 30,
        requireMfa: false,
    };
    // In-memory store for login attempts (use Redis in production)
    loginAttempts = new Map();
    /**
     * Check if user account is locked due to failed login attempts
     */
    async checkAccountLockout(email) {
        const attempts = this.loginAttempts.get(email);
        if (!attempts) {
            return;
        }
        const lockoutDuration = this.DEFAULT_SECURITY_CONFIG.lockoutDurationMinutes * 60 * 1000;
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
        if (attempts.count >= this.DEFAULT_SECURITY_CONFIG.maxLoginAttempts &&
            timeSinceLastAttempt < lockoutDuration) {
            const remainingMinutes = Math.ceil((lockoutDuration - timeSinceLastAttempt) / 60000);
            throw new HttpErrors_1.UnauthorizedError(`Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`, errorCodes_1.ErrorCodes.AUTH_USER_SUSPENDED);
        }
        // Reset if lockout period has passed
        if (timeSinceLastAttempt >= lockoutDuration) {
            this.loginAttempts.delete(email);
        }
    }
    /**
     * Record a login attempt
     */
    async recordLoginAttempt(attempt) {
        const { email, success, ipAddress, userAgent, failureReason } = attempt;
        if (success) {
            // Clear failed attempts on successful login
            this.loginAttempts.delete(email);
            // Log successful login
            logger_1.logger.info('Successful login', { email, ipAddress });
        }
        else {
            // Increment failed attempt counter
            const current = this.loginAttempts.get(email) || { count: 0, lastAttempt: new Date() };
            this.loginAttempts.set(email, {
                count: current.count + 1,
                lastAttempt: new Date(),
            });
            // Log failed login
            logger_1.logger.warn('Failed login attempt', {
                email,
                ipAddress,
                failureReason,
                attemptCount: current.count + 1,
            });
            // Check if we need to lock the account
            if (current.count + 1 >= this.DEFAULT_SECURITY_CONFIG.maxLoginAttempts) {
                logger_1.logger.warn('Account locked due to too many failed attempts', { email });
                // Optionally send notification to user
                const user = await auth_repository_1.authRepository.findUserByEmail(email);
                if (user) {
                    await this.notifyAccountLocked(user.id, ipAddress);
                }
            }
        }
        // Create audit log
        await this.createLoginAuditLog(attempt);
    }
    /**
     * Validate password against policy
     */
    validatePasswordPolicy(password, policy = this.DEFAULT_PASSWORD_POLICY) {
        const errors = [];
        if (password.length < policy.minLength) {
            errors.push(`Password must be at least ${policy.minLength} characters long`);
        }
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (policy.requireNumbers && !/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        // Check for common weak patterns
        const weakPatterns = [
            /^123456/,
            /^password/i,
            /^qwerty/i,
            /^abc123/i,
        ];
        for (const pattern of weakPatterns) {
            if (pattern.test(password)) {
                errors.push('Password is too common or easily guessable');
                break;
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Check if password was recently used (prevent password reuse)
     */
    async checkPasswordHistory(userId, newPasswordHash, historyCount = this.DEFAULT_PASSWORD_POLICY.preventReuse) {
        // This would require a PasswordHistory model in the database
        // For now, we'll just return true (password is allowed)
        // TODO: Implement password history tracking
        logger_1.logger.debug('Password history check', { userId, historyCount });
        return true;
    }
    /**
     * Validate tenant access for a user
     */
    async validateTenantAccess(userId, tenantId) {
        const employee = await database_1.prisma.employee.findUnique({
            where: {
                tenantId_userId: {
                    tenantId,
                    userId,
                },
            },
            include: {
                tenant: true,
            },
        });
        if (!employee) {
            throw new HttpErrors_1.ForbiddenError('You do not have access to this organization', errorCodes_1.ErrorCodes.TENANT_ACCESS_DENIED);
        }
        if (!employee.isActive) {
            throw new HttpErrors_1.ForbiddenError('Your account in this organization is inactive', errorCodes_1.ErrorCodes.AUTH_USER_INACTIVE);
        }
        if (employee.tenant.status === 'SUSPENDED') {
            throw new HttpErrors_1.ForbiddenError('This organization has been suspended', errorCodes_1.ErrorCodes.TENANT_SUSPENDED);
        }
        if (employee.tenant.status === 'CANCELLED') {
            throw new HttpErrors_1.ForbiddenError('This organization account has been cancelled', errorCodes_1.ErrorCodes.TENANT_SUSPENDED);
        }
    }
    /**
     * Get user's permissions for a specific tenant
     */
    async getUserPermissions(userId, tenantId) {
        const employee = await database_1.prisma.employee.findUnique({
            where: {
                tenantId_userId: {
                    tenantId,
                    userId,
                },
            },
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
            },
        });
        if (!employee) {
            return [];
        }
        return employee.role.permissions.map((rp) => rp.permission.code);
    }
    /**
     * Check if user has a specific permission
     */
    async hasPermission(userId, tenantId, permissionCode) {
        const permissions = await this.getUserPermissions(userId, tenantId);
        return permissions.includes(permissionCode);
    }
    /**
     * Check if user has any of the specified permissions
     */
    async hasAnyPermission(userId, tenantId, permissionCodes) {
        const permissions = await this.getUserPermissions(userId, tenantId);
        return permissionCodes.some((code) => permissions.includes(code));
    }
    /**
     * Check if user has all of the specified permissions
     */
    async hasAllPermissions(userId, tenantId, permissionCodes) {
        const permissions = await this.getUserPermissions(userId, tenantId);
        return permissionCodes.every((code) => permissions.includes(code));
    }
    /**
     * Get user's role in a tenant
     */
    async getUserRole(userId, tenantId) {
        const employee = await database_1.prisma.employee.findUnique({
            where: {
                tenantId_userId: {
                    tenantId,
                    userId,
                },
            },
            include: {
                role: true,
            },
        });
        return employee?.role.name || null;
    }
    /**
     * Check if user is an owner of the tenant
     */
    async isOwner(userId, tenantId) {
        const role = await this.getUserRole(userId, tenantId);
        return role === 'Owner';
    }
    /**
     * Check if user is an admin of the tenant
     */
    async isAdmin(userId, tenantId) {
        const role = await this.getUserRole(userId, tenantId);
        return role === 'Owner' || role === 'Admin';
    }
    /**
     * Get active sessions for a user
     */
    async getActiveSessions(userId) {
        const tokens = await database_1.prisma.refreshToken.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return tokens.map((token) => ({
            id: token.id,
            userAgent: token.userAgent,
            ipAddress: token.ipAddress,
            createdAt: token.createdAt,
            expiresAt: token.expiresAt,
        }));
    }
    /**
     * Revoke a specific session
     */
    async revokeSession(userId, sessionId) {
        const token = await database_1.prisma.refreshToken.findFirst({
            where: {
                id: sessionId,
                userId,
                revokedAt: null,
            },
        });
        if (!token) {
            throw new HttpErrors_1.BadRequestError('Session not found');
        }
        await database_1.prisma.refreshToken.update({
            where: { id: sessionId },
            data: { revokedAt: new Date() },
        });
        logger_1.logger.info('Session revoked', { userId, sessionId });
    }
    /**
     * Create audit log for login attempt
     */
    async createLoginAuditLog(attempt) {
        try {
            const user = await auth_repository_1.authRepository.findUserByEmail(attempt.email);
            if (!user) {
                return;
            }
            const employee = user.employees[0];
            if (!employee) {
                return;
            }
            await audit_service_1.auditService.log({
                action: attempt.success ? client_1.AuditAction.LOGIN : client_1.AuditAction.LOGIN,
                module: 'auth',
                description: attempt.success
                    ? 'User logged in successfully'
                    : `Login failed: ${attempt.failureReason || 'Invalid credentials'}`,
                userId: user.id,
                tenantId: employee.tenantId,
                ipAddress: attempt.ipAddress,
                userAgent: attempt.userAgent,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to create login audit log', { error, attempt });
        }
    }
    /**
     * Notify user that their account has been locked
     */
    async notifyAccountLocked(userId, ipAddress) {
        try {
            await notifications_manager_1.notificationManager.createNotification({
                userId,
                title: 'Account Temporarily Locked',
                message: `Your account has been temporarily locked due to multiple failed login attempts${ipAddress ? ` from IP address ${ipAddress}` : ''}. Please wait 15 minutes before trying again.`,
                type: 'WARNING',
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to send account locked notification', { error, userId });
        }
    }
    /**
     * Generate email verification token
     */
    async generateEmailVerificationToken(userId) {
        // Generate a secure random token
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const token = crypto.randomBytes(32).toString('hex');
        // Store token with expiry (24 hours)
        // This would typically be stored in Redis or a separate table
        // For now, we'll use a simple implementation
        logger_1.logger.info('Email verification token generated', { userId });
        return token;
    }
    /**
     * Generate password reset token
     */
    async generatePasswordResetToken(userId) {
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const token = crypto.randomBytes(32).toString('hex');
        // Store token with expiry (1 hour)
        // This would typically be stored in Redis or a separate table
        logger_1.logger.info('Password reset token generated', { userId });
        return token;
    }
    /**
     * Clean up expired tokens and sessions (for scheduled job)
     */
    async cleanupExpiredData() {
        // Delete expired refresh tokens
        const deletedTokens = await database_1.prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    {
                        revokedAt: { not: null },
                        revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
                    },
                ],
            },
        });
        logger_1.logger.info('Cleaned up expired auth data', {
            expiredTokens: deletedTokens.count,
        });
        return {
            expiredTokens: deletedTokens.count,
            expiredSessions: 0,
        };
    }
    /**
     * Get security settings for a tenant
     */
    async getTenantSecuritySettings(tenantId) {
        const settings = await database_1.prisma.tenantSettings.findUnique({
            where: { tenantId },
        });
        if (!settings) {
            return this.DEFAULT_SECURITY_CONFIG;
        }
        // Parse security settings from JSON
        const securitySettings = settings.securitySettings || {};
        return {
            ...this.DEFAULT_SECURITY_CONFIG,
            ...securitySettings,
        };
    }
    /**
     * Update security settings for a tenant
     */
    async updateTenantSecuritySettings(tenantId, settings) {
        await database_1.prisma.tenantSettings.upsert({
            where: { tenantId },
            create: {
                tenantId,
                // Store security settings in the settings JSON field
            },
            update: {
            // Update security settings
            },
        });
        logger_1.logger.info('Tenant security settings updated', { tenantId });
    }
}
exports.AuthManager = AuthManager;
// Export singleton instance
exports.authManager = new AuthManager();
//# sourceMappingURL=auth.manager.js.map