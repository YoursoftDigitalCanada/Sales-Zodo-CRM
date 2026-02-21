"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const uuid_1 = require("uuid");
const auth_repository_1 = require("./auth.repository");
const jwt_1 = require("../../common/utils/jwt");
const password_1 = require("../../common/utils/password");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
const database_1 = require("../../config/database");
const logger_1 = require("../../common/utils/logger");
const modules_1 = require("../../common/constants/modules");
class AuthService {
    /**
     * Login user with email and password
     */
    async login(input, metadata) {
        const user = await auth_repository_1.authRepository.findUserByEmail(input.email.toLowerCase());
        if (!user) {
            throw new HttpErrors_1.UnauthorizedError('Invalid email or password', errorCodes_1.ErrorCodes.AUTH_INVALID_CREDENTIALS);
        }
        // Check user status
        if (user.status === 'SUSPENDED') {
            throw new HttpErrors_1.UnauthorizedError('Your account has been suspended', errorCodes_1.ErrorCodes.AUTH_USER_SUSPENDED);
        }
        if (user.status === 'INACTIVE') {
            throw new HttpErrors_1.UnauthorizedError('Your account is inactive', errorCodes_1.ErrorCodes.AUTH_USER_INACTIVE);
        }
        if (user.status === 'PENDING_VERIFICATION' && !user.emailVerified) {
            throw new HttpErrors_1.UnauthorizedError('Please verify your email before logging in', errorCodes_1.ErrorCodes.AUTH_USER_NOT_VERIFIED);
        }
        // Verify password
        const isPasswordValid = await (0, password_1.comparePassword)(input.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new HttpErrors_1.UnauthorizedError('Invalid email or password', errorCodes_1.ErrorCodes.AUTH_INVALID_CREDENTIALS);
        }
        // Get the first active employee (for now - could be extended to handle multiple tenants)
        const employee = user.employees[0];
        if (!employee) {
            throw new HttpErrors_1.UnauthorizedError('You are not associated with any organization', errorCodes_1.ErrorCodes.TENANT_ACCESS_DENIED);
        }
        // Check tenant status
        if (employee.tenant.status === 'SUSPENDED') {
            throw new HttpErrors_1.UnauthorizedError('Your organization has been suspended', errorCodes_1.ErrorCodes.TENANT_SUSPENDED);
        }
        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email, employee.tenantId, employee.id, metadata);
        // Get permissions
        const permissions = employee.role.permissions.map((rp) => rp.permission.code);
        // Get sidebar modules based on permissions
        const sidebarModules = (0, modules_1.getModulesForPermissions)(permissions);
        // Update last login
        await auth_repository_1.authRepository.updateUser(user.id, {
            lastLoginAt: new Date(),
        });
        logger_1.logger.info(`User logged in: ${user.email}`, { userId: user.id, tenantId: employee.tenantId });
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar || undefined,
            },
            employee: {
                id: employee.id,
                role: {
                    id: employee.role.id,
                    name: employee.role.name,
                },
                department: employee.department || undefined,
                position: employee.position || undefined,
            },
            tenant: {
                id: employee.tenant.id,
                name: employee.tenant.name,
                slug: employee.tenant.slug,
            },
            tokens,
            permissions,
            sidebarModules,
        };
    }
    /**
     * Register a new user and optionally create a new tenant
     */
    async register(input) {
        const existingUser = await auth_repository_1.authRepository.findUserByEmail(input.email.toLowerCase());
        if (existingUser) {
            throw new HttpErrors_1.ConflictError('An account with this email already exists', errorCodes_1.ErrorCodes.USER_ALREADY_EXISTS);
        }
        // Hash password
        const passwordHash = await (0, password_1.hashPassword)(input.password);
        // Create user and tenant in a transaction
        const result = await database_1.prisma.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    email: input.email.toLowerCase(),
                    passwordHash,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    status: 'ACTIVE',
                    emailVerified: true,
                },
            });
            // Create tenant
            const tenantName = input.tenantName || `${input.firstName}'s Organization`;
            const tenantSlug = input.tenantSlug || this.generateSlug(tenantName);
            const tenant = await tx.tenant.create({
                data: {
                    name: tenantName,
                    slug: tenantSlug,
                    status: 'TRIAL',
                },
            });
            // Create default Owner role for the tenant
            const ownerRole = await tx.role.create({
                data: {
                    name: 'Owner',
                    description: 'Full access to all features',
                    isSystemRole: true,
                    tenantId: tenant.id,
                },
            });
            // Assign all permissions to Owner role
            const allPermissions = await tx.permission.findMany();
            await tx.rolePermission.createMany({
                data: allPermissions.map((permission) => ({
                    roleId: ownerRole.id,
                    permissionId: permission.id,
                })),
            });
            // Create employee record
            const employee = await tx.employee.create({
                data: {
                    userId: user.id,
                    tenantId: tenant.id,
                    roleId: ownerRole.id,
                    isActive: true,
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
                    tenant: true,
                },
            });
            // Update user with tenant reference
            await tx.user.update({
                where: { id: user.id },
                data: { tenantId: tenant.id },
            });
            // Create tenant settings
            await tx.tenantSettings.create({
                data: {
                    tenantId: tenant.id,
                },
            });
            // Create user preferences
            await tx.userPreferences.create({
                data: {
                    userId: user.id,
                },
            });
            return { user, employee, tenant };
        });
        // Generate tokens
        const tokens = await this.generateTokens(result.user.id, result.user.email, result.tenant.id, result.employee.id, {});
        // Get permissions
        const permissions = result.employee.role.permissions.map((rp) => rp.permission.code);
        // Get sidebar modules
        const sidebarModules = (0, modules_1.getModulesForPermissions)(permissions);
        logger_1.logger.info(`New user registered: ${result.user.email}`, {
            userId: result.user.id,
            tenantId: result.tenant.id
        });
        return {
            user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
            },
            employee: {
                id: result.employee.id,
                role: {
                    id: result.employee.role.id,
                    name: result.employee.role.name,
                },
            },
            tenant: {
                id: result.tenant.id,
                name: result.tenant.name,
                slug: result.tenant.slug,
            },
            tokens,
            permissions,
            sidebarModules,
        };
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken, metadata) {
        const storedToken = await auth_repository_1.authRepository.findRefreshToken(refreshToken);
        if (!storedToken) {
            throw new HttpErrors_1.UnauthorizedError('Invalid refresh token', errorCodes_1.ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
        }
        // Check if token is revoked
        if (storedToken.revokedAt) {
            await auth_repository_1.authRepository.revokeAllUserRefreshTokens(storedToken.userId);
            logger_1.logger.warn('Refresh token reuse detected', {
                userId: storedToken.userId,
                tokenId: storedToken.id,
            });
            throw new HttpErrors_1.UnauthorizedError('Invalid refresh token', errorCodes_1.ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
        }
        // Check if token is expired
        if (storedToken.expiresAt < new Date()) {
            throw new HttpErrors_1.UnauthorizedError('Refresh token has expired', errorCodes_1.ErrorCodes.AUTH_REFRESH_TOKEN_EXPIRED);
        }
        // Verify the JWT
        try {
            (0, jwt_1.verifyRefreshToken)(refreshToken);
        }
        catch (error) {
            throw new HttpErrors_1.UnauthorizedError('Invalid refresh token', errorCodes_1.ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
        }
        const user = storedToken.user;
        const employee = user.employees[0];
        if (!employee) {
            throw new HttpErrors_1.UnauthorizedError('You are not associated with any organization', errorCodes_1.ErrorCodes.TENANT_ACCESS_DENIED);
        }
        // Generate new tokens (token rotation)
        const newTokens = await this.generateTokens(user.id, user.email, employee.tenantId, employee.id, metadata);
        // Revoke old refresh token
        await auth_repository_1.authRepository.revokeRefreshToken(refreshToken, newTokens.refreshToken);
        return newTokens;
    }
    /**
     * Logout user by revoking refresh token
     */
    async logout(refreshToken) {
        const storedToken = await auth_repository_1.authRepository.findRefreshToken(refreshToken);
        if (storedToken && !storedToken.revokedAt) {
            await auth_repository_1.authRepository.revokeRefreshToken(refreshToken);
            logger_1.logger.info('User logged out', { userId: storedToken.userId });
        }
    }
    /**
     * Logout from all devices
     */
    async logoutAll(userId) {
        await auth_repository_1.authRepository.revokeAllUserRefreshTokens(userId);
        logger_1.logger.info('User logged out from all devices', { userId });
    }
    /**
     * Change password
     */
    async changePassword(userId, input) {
        const user = await auth_repository_1.authRepository.findUserById(userId);
        if (!user) {
            throw new HttpErrors_1.NotFoundError('User not found', errorCodes_1.ErrorCodes.USER_NOT_FOUND);
        }
        // Verify current password
        const isPasswordValid = await (0, password_1.comparePassword)(input.currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new HttpErrors_1.BadRequestError('Current password is incorrect', errorCodes_1.ErrorCodes.AUTH_INVALID_CREDENTIALS);
        }
        // Hash new password
        const newPasswordHash = await (0, password_1.hashPassword)(input.newPassword);
        // Update password and revoke all refresh tokens
        await database_1.prisma.$transaction([
            database_1.prisma.user.update({
                where: { id: userId },
                data: {
                    passwordHash: newPasswordHash,
                    passwordChangedAt: new Date(),
                },
            }),
            database_1.prisma.refreshToken.updateMany({
                where: {
                    userId,
                    revokedAt: null,
                },
                data: {
                    revokedAt: new Date(),
                },
            }),
        ]);
        logger_1.logger.info(`Password changed for user: ${user.email}`, { userId });
    }
    /**
     * Get current user profile with permissions and sidebar modules
     */
    async getProfile(userId, tenantId) {
        const employee = await auth_repository_1.authRepository.findEmployeeWithPermissions(userId, tenantId);
        if (!employee) {
            throw new HttpErrors_1.NotFoundError('Employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
        }
        const user = await auth_repository_1.authRepository.findUserById(userId);
        if (!user) {
            throw new HttpErrors_1.NotFoundError('User not found', errorCodes_1.ErrorCodes.USER_NOT_FOUND);
        }
        const permissions = employee.role.permissions.map((rp) => rp.permission.code);
        const sidebarModules = (0, modules_1.getModulesForPermissions)(permissions);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                phone: user.phone,
            },
            employee: {
                id: employee.id,
                employeeNumber: employee.employeeNumber,
                department: employee.department,
                position: employee.position,
                role: {
                    id: employee.role.id,
                    name: employee.role.name,
                },
            },
            tenant: {
                id: employee.tenant.id,
                name: employee.tenant.name,
                slug: employee.tenant.slug,
                logo: employee.tenant.logo,
            },
            permissions,
            sidebarModules,
        };
    }
    /**
     * Switch tenant for users with multiple tenant memberships
     */
    async switchTenant(userId, targetTenantId, metadata) {
        const user = await auth_repository_1.authRepository.findUserById(userId);
        if (!user) {
            throw new HttpErrors_1.NotFoundError('User not found', errorCodes_1.ErrorCodes.USER_NOT_FOUND);
        }
        // Find employee record for target tenant
        const employee = user.employees.find((emp) => emp.tenantId === targetTenantId && emp.isActive);
        if (!employee) {
            throw new HttpErrors_1.UnauthorizedError('You do not have access to this organization', errorCodes_1.ErrorCodes.TENANT_ACCESS_DENIED);
        }
        // Get full employee details with permissions
        const employeeWithPermissions = await auth_repository_1.authRepository.findEmployeeWithPermissions(userId, targetTenantId);
        if (!employeeWithPermissions) {
            throw new HttpErrors_1.NotFoundError('Employee not found', errorCodes_1.ErrorCodes.EMPLOYEE_NOT_FOUND);
        }
        // Check tenant status
        if (employeeWithPermissions.tenant.status === 'SUSPENDED') {
            throw new HttpErrors_1.UnauthorizedError('This organization has been suspended', errorCodes_1.ErrorCodes.TENANT_SUSPENDED);
        }
        // Generate new tokens for the target tenant
        const tokens = await this.generateTokens(user.id, user.email, targetTenantId, employeeWithPermissions.id, metadata);
        // Get permissions
        const permissions = employeeWithPermissions.role.permissions.map((rp) => rp.permission.code);
        const sidebarModules = (0, modules_1.getModulesForPermissions)(permissions);
        logger_1.logger.info(`User switched tenant: ${user.email}`, {
            userId: user.id,
            tenantId: targetTenantId
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar || undefined,
            },
            employee: {
                id: employeeWithPermissions.id,
                role: {
                    id: employeeWithPermissions.role.id,
                    name: employeeWithPermissions.role.name,
                },
                department: employeeWithPermissions.department || undefined,
                position: employeeWithPermissions.position || undefined,
            },
            tenant: {
                id: employeeWithPermissions.tenant.id,
                name: employeeWithPermissions.tenant.name,
                slug: employeeWithPermissions.tenant.slug,
            },
            tokens,
            permissions,
            sidebarModules,
        };
    }
    /**
     * Get list of tenants user has access to
     */
    async getUserTenants(userId) {
        const user = await auth_repository_1.authRepository.findUserById(userId);
        if (!user) {
            throw new HttpErrors_1.NotFoundError('User not found', errorCodes_1.ErrorCodes.USER_NOT_FOUND);
        }
        return user.employees
            .filter((emp) => emp.isActive)
            .map((emp) => ({
            tenantId: emp.tenant.id,
            tenantName: emp.tenant.name,
            tenantSlug: emp.tenant.slug,
            tenantLogo: emp.tenant.logo,
            role: emp.role.name,
            employeeId: emp.id,
        }));
    }
    /**
     * Verify email address (for email verification flow)
     */
    async verifyEmail(token) {
        // This would typically involve:
        // 1. Decoding the verification token
        // 2. Finding the user
        // 3. Marking email as verified
        // For now, this is a stub - implement based on your verification token strategy
        // Example implementation:
        // const decoded = verifyEmailToken(token);
        // await authRepository.updateUser(decoded.userId, {
        //   emailVerified: true,
        //   emailVerifiedAt: new Date(),
        //   status: 'ACTIVE',
        // });
        logger_1.logger.info('Email verification requested', { token: token.substring(0, 10) + '...' });
        throw new HttpErrors_1.BadRequestError('Email verification not implemented');
    }
    /**
     * Request password reset
     */
    async forgotPassword(email) {
        const user = await auth_repository_1.authRepository.findUserByEmail(email.toLowerCase());
        if (!user) {
            // Don't reveal if user exists or not
            logger_1.logger.info('Password reset requested for non-existent email', { email });
            return;
        }
        // Generate reset token and send email
        // This would typically involve:
        // 1. Generating a secure reset token
        // 2. Storing it in the database with expiry
        // 3. Sending email with reset link
        // For now, just log the request
        logger_1.logger.info('Password reset requested', { userId: user.id, email });
        // TODO: Implement email sending
        // const resetToken = generateResetToken();
        // await sendPasswordResetEmail(user.email, resetToken);
    }
    /**
     * Reset password using reset token
     */
    async resetPassword(token, newPassword) {
        // This would typically involve:
        // 1. Verifying the reset token
        // 2. Checking if token is expired
        // 3. Updating the password
        // 4. Invalidating the reset token
        // 5. Revoking all refresh tokens
        // For now, this is a stub
        logger_1.logger.info('Password reset attempted', { token: token.substring(0, 10) + '...' });
        throw new HttpErrors_1.BadRequestError('Password reset not implemented');
    }
    /**
     * Generate access and refresh tokens
     */
    async generateTokens(userId, email, tenantId, employeeId, metadata) {
        const tokenPayload = {
            userId,
            email,
            tenantId,
            employeeId,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(tokenPayload);
        // Calculate expiry
        const expiresAt = (0, jwt_1.getTokenExpiry)(refreshToken);
        if (!expiresAt) {
            throw new Error('Failed to generate token expiry');
        }
        // Store refresh token
        await auth_repository_1.authRepository.createRefreshToken({
            token: refreshToken,
            userId,
            expiresAt,
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress,
        });
        // Parse access token expiry for response
        const accessExpiresAt = (0, jwt_1.getTokenExpiry)(accessToken);
        const expiresIn = accessExpiresAt
            ? Math.floor((accessExpiresAt.getTime() - Date.now()) / 1000)
            : 900; // Default 15 minutes
        return {
            accessToken,
            refreshToken,
            expiresIn,
            tokenType: 'Bearer',
        };
    }
    /**
     * Generate URL-safe slug from string
     */
    generateSlug(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50) + '-' + (0, uuid_1.v4)().substring(0, 8);
    }
    /**
     * Clean up expired refresh tokens (for scheduled job)
     */
    async cleanupExpiredTokens() {
        const result = await auth_repository_1.authRepository.deleteExpiredRefreshTokens();
        logger_1.logger.info(`Cleaned up ${result.count} expired refresh tokens`);
        return result.count;
    }
}
exports.AuthService = AuthService;
// Export singleton instance
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map