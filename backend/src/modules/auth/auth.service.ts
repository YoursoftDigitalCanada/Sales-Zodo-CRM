import { v4 as uuidv4 } from 'uuid';
import { authRepository } from './auth.repository';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiry,
} from '../../common/utils/jwt';
import { hashPassword, comparePassword } from '../../common/utils/password';
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import {
  LoginInput,
  RegisterInput,
  AuthResponse,
  TokenResponse,
  ChangePasswordInput,
} from './auth.types';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';
import { getModulesForPermissions } from '../../common/constants/modules';
import { onboardingService } from '../tenants/onboarding.service';
import { settingsManager } from '../settings/settings.manager';

export class AuthService {
  /**
   * Login user with email and password
   */
  async login(
    input: LoginInput,
    metadata: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthResponse> {
    const user = await authRepository.findUserByEmail(input.email.toLowerCase());

    if (!user) {
      throw new UnauthorizedError(
        'Invalid email or password',
        ErrorCodes.AUTH_INVALID_CREDENTIALS
      );
    }

    // Check user status
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError(
        'Your account has been suspended',
        ErrorCodes.AUTH_USER_SUSPENDED
      );
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedError(
        'Your account is inactive',
        ErrorCodes.AUTH_USER_INACTIVE
      );
    }

    if (user.status === 'PENDING_VERIFICATION' && !user.emailVerified) {
      throw new UnauthorizedError(
        'Please verify your email before logging in',
        ErrorCodes.AUTH_USER_NOT_VERIFIED
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError(
        'Invalid email or password',
        ErrorCodes.AUTH_INVALID_CREDENTIALS
      );
    }

    // Get the first active employee (for now - could be extended to handle multiple tenants)
    const employee = user.employees[0];

    if (!employee) {
      throw new UnauthorizedError(
        'You are not associated with any organization',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    // Check tenant status
    if (employee.tenant.status === 'SUSPENDED') {
      throw new UnauthorizedError(
        'Your organization has been suspended',
        ErrorCodes.TENANT_SUSPENDED
      );
    }

    await settingsManager.assertIpAllowed(employee.tenantId, metadata.ipAddress);

    // Generate tokens (tenantId + role from DB, not frontend)
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      employee.tenantId,
      employee.id,
      employee.role.name,
      metadata
    );

    // Get permissions
    const permissions = employee.role.permissions.map(
      (rp) => rp.permission.code
    );

    // Get sidebar modules based on permissions
    const sidebarModules = getModulesForPermissions(permissions);

    // Update last login
    await authRepository.updateUser(user.id, {
      lastLoginAt: new Date(),
    });

    logger.info(`User logged in: ${user.email}`, { userId: user.id, tenantId: employee.tenantId });

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
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await authRepository.findUserByEmail(input.email.toLowerCase());

    if (existingUser) {
      throw new ConflictError(
        'An account with this email already exists',
        ErrorCodes.USER_ALREADY_EXISTS
      );
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user and tenant in a transaction
    const result = await prisma.$transaction(async (tx) => {
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

      // ── ONBOARDING: seed roles, permissions, lead sources, tags, settings ──
      const onboarding = await onboardingService.seedTenant(tx, tenant.id);

      // Create employee record linked to Owner role
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          roleId: onboarding.roles.owner,
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

      // Create user preferences
      await tx.userPreferences.create({
        data: {
          userId: user.id,
        },
      });

      return { user, employee, tenant };
    });

    // Generate tokens (tenantId + role from DB)
    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.tenant.id,
      result.employee.id,
      result.employee.role.name,
      {}
    );

    // Get permissions
    const permissions = result.employee.role.permissions.map(
      (rp) => rp.permission.code
    );

    // Get sidebar modules
    const sidebarModules = getModulesForPermissions(permissions);

    logger.info(`New user registered: ${result.user.email}`, {
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
  async refreshToken(
    refreshToken: string,
    metadata: { userAgent?: string; ipAddress?: string }
  ): Promise<TokenResponse> {
    const storedToken = await authRepository.findRefreshToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedError(
        'Invalid refresh token',
        ErrorCodes.AUTH_REFRESH_TOKEN_INVALID
      );
    }

    // Check if token is revoked
    if (storedToken.revokedAt) {
      await authRepository.revokeAllUserRefreshTokens(storedToken.userId);

      logger.warn('Refresh token reuse detected', {
        userId: storedToken.userId,
        tokenId: storedToken.id,
      });

      throw new UnauthorizedError(
        'Invalid refresh token',
        ErrorCodes.AUTH_REFRESH_TOKEN_INVALID
      );
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError(
        'Refresh token has expired',
        ErrorCodes.AUTH_REFRESH_TOKEN_EXPIRED
      );
    }

    // Verify the JWT
    try {
      verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedError(
        'Invalid refresh token',
        ErrorCodes.AUTH_REFRESH_TOKEN_INVALID
      );
    }

    const user = storedToken.user;
    const employee = user.employees[0];

    if (!employee) {
      throw new UnauthorizedError(
        'You are not associated with any organization',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    await settingsManager.assertIpAllowed(employee.tenantId, metadata.ipAddress);

    // Generate new tokens (token rotation — tenantId + role from DB)
    const newTokens = await this.generateTokens(
      user.id,
      user.email,
      employee.tenantId,
      employee.id,
      employee.role?.name || '',
      metadata
    );

    // Revoke old refresh token
    await authRepository.revokeRefreshToken(refreshToken, newTokens.refreshToken);

    return newTokens;
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    const storedToken = await authRepository.findRefreshToken(refreshToken);

    if (storedToken && !storedToken.revokedAt) {
      await authRepository.revokeRefreshToken(refreshToken);
      logger.info('User logged out', { userId: storedToken.userId });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await authRepository.revokeAllUserRefreshTokens(userId);
    logger.info('User logged out from all devices', { userId });
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.USER_NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      input.currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new BadRequestError(
        'Current password is incorrect',
        ErrorCodes.AUTH_INVALID_CREDENTIALS
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(input.newPassword);

    // Update password and revoke all refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
        },
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    logger.info(`Password changed for user: ${user.email}`, { userId });
  }

  /**
   * Get current user profile with permissions and sidebar modules
   */
  async getProfile(userId: string, tenantId: string): Promise<any> {
    const employee = await authRepository.findEmployeeWithPermissions(userId, tenantId);

    if (!employee) {
      throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
    }

    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.USER_NOT_FOUND);
    }

    const permissions = employee.role.permissions.map(
      (rp) => rp.permission.code
    );

    const sidebarModules = getModulesForPermissions(permissions);

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
   * Switch tenant for users with multiple tenant memberships.
   *
   * Security: Verifies user is an active employee of the target tenant
   * via DB lookup. Returns 403 Forbidden if not a member.
   * Issues a new JWT scoped to the validated target tenant.
   */
  async switchTenant(
    userId: string,
    targetTenantId: string,
    metadata: { userAgent?: string; ipAddress?: string; sourceTenantId?: string }
  ): Promise<AuthResponse> {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.USER_NOT_FOUND);
    }

    // ── DB ownership check: user must be an active employee of target tenant
    const employee = user.employees.find(
      (emp) => emp.tenantId === targetTenantId && emp.isActive
    );

    if (!employee) {
      logger.warn('Tenant switch denied — user is not a member', {
        userId: user.id,
        email: user.email,
        targetTenantId,
        sourceTenantId: metadata.sourceTenantId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      throw new ForbiddenError(
        'You do not have access to this organization',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    // Get full employee details with permissions
    const employeeWithPermissions = await authRepository.findEmployeeWithPermissions(
      userId,
      targetTenantId
    );

    if (!employeeWithPermissions) {
      throw new NotFoundError('Employee not found', ErrorCodes.EMPLOYEE_NOT_FOUND);
    }

    // Check tenant status
    if (employeeWithPermissions.tenant.status === 'SUSPENDED') {
      throw new UnauthorizedError(
        'This organization has been suspended',
        ErrorCodes.TENANT_SUSPENDED
      );
    }

    // Generate new tokens for the target tenant (role from DB)
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      targetTenantId,
      employeeWithPermissions.id,
      employeeWithPermissions.role.name,
      metadata
    );

    // Get permissions
    const permissions = employeeWithPermissions.role.permissions.map(
      (rp) => rp.permission.code
    );

    const sidebarModules = getModulesForPermissions(permissions);

    logger.info('Tenant switch successful', {
      userId: user.id,
      email: user.email,
      sourceTenantId: metadata.sourceTenantId || 'none',
      targetTenantId,
      targetTenantName: employeeWithPermissions.tenant.name,
      targetRole: employeeWithPermissions.role.name,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
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
  async getUserTenants(userId: string): Promise<any[]> {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.USER_NOT_FOUND);
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
  async verifyEmail(token: string): Promise<void> {
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

    logger.info('Email verification requested', { token: token.substring(0, 10) + '...' });
    throw new BadRequestError('Email verification not implemented');
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email.toLowerCase());

    if (!user) {
      // Don't reveal if user exists or not
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    // Generate reset token and send email
    // This would typically involve:
    // 1. Generating a secure reset token
    // 2. Storing it in the database with expiry
    // 3. Sending email with reset link

    // For now, just log the request
    logger.info('Password reset requested', { userId: user.id, email });

    // TODO: Implement email sending
    // const resetToken = generateResetToken();
    // await sendPasswordResetEmail(user.email, resetToken);
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // This would typically involve:
    // 1. Verifying the reset token
    // 2. Checking if token is expired
    // 3. Updating the password
    // 4. Invalidating the reset token
    // 5. Revoking all refresh tokens

    // For now, this is a stub
    logger.info('Password reset attempted', { token: token.substring(0, 10) + '...' });
    throw new BadRequestError('Password reset not implemented');
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    tenantId: string,
    employeeId: string,
    role: string,
    metadata: { userAgent?: string; ipAddress?: string }
  ): Promise<TokenResponse> {
    const tokenPayload = {
      userId,
      email,
      tenantId,
      employeeId,
      role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Calculate expiry
    const expiresAt = getTokenExpiry(refreshToken);
    const sessionTimeoutMinutes = await settingsManager.getSessionTimeoutMinutes(tenantId);

    if (!expiresAt) {
      throw new Error('Failed to generate token expiry');
    }

    const sessionExpiry = new Date(Date.now() + sessionTimeoutMinutes * 60 * 1000);
    const effectiveExpiry = expiresAt < sessionExpiry ? expiresAt : sessionExpiry;

    // Store refresh token
    await authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt: effectiveExpiry,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    // Parse access token expiry for response
    const accessExpiresAt = getTokenExpiry(accessToken);
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
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) + '-' + uuidv4().substring(0, 8);
  }

  /**
   * Clean up expired refresh tokens (for scheduled job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await authRepository.deleteExpiredRefreshTokens();
    logger.info(`Cleaned up ${result.count} expired refresh tokens`);
    return result.count;
  }
}

// Export singleton instance
export const authService = new AuthService();
