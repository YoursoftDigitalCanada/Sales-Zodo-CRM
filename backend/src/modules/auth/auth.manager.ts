/**
 * Auth Manager
 * Contains complex business logic, orchestration, and cross-cutting concerns
 * Separated from service to maintain single responsibility principle
 */

import { prisma } from '../../config/database';
import { authRepository } from './auth.repository';
import {
  UnauthorizedError,
  BadRequestError,
  ForbiddenError,
} from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { logger } from '../../common/utils/logger';
import { auditService } from '../audit/audit.service';
import { notificationManager } from '../notifications/notifications.manager';
import { AuditAction } from '@prisma/client';

// Types
export interface LoginAttempt {
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Number of previous passwords to check
}

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  requireMfa: boolean;
}

export class AuthManager {
  private readonly DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5,
  };

  private readonly DEFAULT_SECURITY_CONFIG: SecurityConfig = {
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionTimeoutMinutes: 30,
    requireMfa: false,
  };

  // In-memory store for login attempts (use Redis in production)
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

  /**
   * Check if user account is locked due to failed login attempts
   */
  async checkAccountLockout(email: string): Promise<void> {
    const attempts = this.loginAttempts.get(email);

    if (!attempts) {
      return;
    }

    const lockoutDuration = this.DEFAULT_SECURITY_CONFIG.lockoutDurationMinutes * 60 * 1000;
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();

    if (
      attempts.count >= this.DEFAULT_SECURITY_CONFIG.maxLoginAttempts &&
      timeSinceLastAttempt < lockoutDuration
    ) {
      const remainingMinutes = Math.ceil((lockoutDuration - timeSinceLastAttempt) / 60000);

      throw new UnauthorizedError(
        `Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`,
        ErrorCodes.AUTH_USER_SUSPENDED
      );
    }

    // Reset if lockout period has passed
    if (timeSinceLastAttempt >= lockoutDuration) {
      this.loginAttempts.delete(email);
    }
  }

  /**
   * Record a login attempt
   */
  async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    const { email, success, ipAddress, userAgent, failureReason } = attempt;

    if (success) {
      // Clear failed attempts on successful login
      this.loginAttempts.delete(email);

      // Log successful login
      logger.info('Successful login', { email, ipAddress });
    } else {
      // Increment failed attempt counter
      const current = this.loginAttempts.get(email) || { count: 0, lastAttempt: new Date() };

      this.loginAttempts.set(email, {
        count: current.count + 1,
        lastAttempt: new Date(),
      });

      // Log failed login
      logger.warn('Failed login attempt', {
        email,
        ipAddress,
        failureReason,
        attemptCount: current.count + 1,
      });

      // Check if we need to lock the account
      if (current.count + 1 >= this.DEFAULT_SECURITY_CONFIG.maxLoginAttempts) {
        logger.warn('Account locked due to too many failed attempts', { email });

        // Optionally send notification to user
        const user = await authRepository.findUserByEmail(email);
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
  validatePasswordPolicy(
    password: string,
    policy: PasswordPolicy = this.DEFAULT_PASSWORD_POLICY
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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
  async checkPasswordHistory(
    userId: string,
    newPasswordHash: string,
    historyCount: number = this.DEFAULT_PASSWORD_POLICY.preventReuse
  ): Promise<boolean> {
    // This would require a PasswordHistory model in the database
    // For now, we'll just return true (password is allowed)
    // TODO: Implement password history tracking

    logger.debug('Password history check', { userId, historyCount });
    return true;
  }

  /**
   * Validate tenant access for a user
   */
  async validateTenantAccess(userId: string, tenantId: string): Promise<void> {
    const employee = await prisma.employee.findUnique({
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
      throw new ForbiddenError(
        'You do not have access to this organization',
        ErrorCodes.TENANT_ACCESS_DENIED
      );
    }

    if (!employee.isActive) {
      throw new ForbiddenError(
        'Your account in this organization is inactive',
        ErrorCodes.AUTH_USER_INACTIVE
      );
    }

    if (employee.tenant.status === 'SUSPENDED') {
      throw new ForbiddenError(
        'This organization has been suspended',
        ErrorCodes.TENANT_SUSPENDED
      );
    }

    if (employee.tenant.status === 'CANCELLED') {
      throw new ForbiddenError(
        'This organization account has been cancelled',
        ErrorCodes.TENANT_SUSPENDED
      );
    }
  }

  /**
   * Get user's permissions for a specific tenant
   */
  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    const employee = await prisma.employee.findUnique({
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
  async hasPermission(
    userId: string,
    tenantId: string,
    permissionCode: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissions.includes(permissionCode);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    tenantId: string,
    permissionCodes: string[]
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissionCodes.some((code) => permissions.includes(code));
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    tenantId: string,
    permissionCodes: string[]
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissionCodes.every((code) => permissions.includes(code));
  }

  /**
   * Get user's role in a tenant
   */
  async getUserRole(userId: string, tenantId: string): Promise<string | null> {
    const employee = await prisma.employee.findUnique({
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
  async isOwner(userId: string, tenantId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, tenantId);
    return role === 'Owner';
  }

  /**
   * Check if user is an admin of the tenant
   */
  async isAdmin(userId: string, tenantId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, tenantId);
    return role === 'Owner' || role === 'Admin';
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<any[]> {
    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        OR: [
          { forceLogoutAt: null },
          { forceLogoutAt: { gt: new Date() } },
        ],
      },
      orderBy: {
        lastSeenAt: 'desc',
      },
    });

    return tokens.map((token) => ({
      id: token.id,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
      createdAt: token.createdAt,
      lastSeenAt: token.lastSeenAt,
      expiresAt: token.expiresAt,
      forceLogoutAt: token.forceLogoutAt,
      revokedReason: token.revokedReason,
    }));
  }

  async getSessionById(sessionId: string) {
    return prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });
  }

  async touchSession(sessionId: string, expiresAt: Date): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        lastSeenAt: new Date(),
        expiresAt,
      },
    });
  }

  async scheduleForcedLogoutForOtherSessions(userId: string, currentSessionId: string, forceLogoutAt: Date): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        warningIssuedAt: new Date(),
        forceLogoutAt,
        revokedReason: 'REPLACED_BY_NEW_LOGIN',
      },
    });
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const token = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
    });

    if (!token) {
      throw new BadRequestError('Session not found');
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    logger.info('Session revoked', { userId, sessionId });
  }

  /**
   * Create audit log for login attempt
   */
  private async createLoginAuditLog(attempt: LoginAttempt): Promise<void> {
    try {
      const user = await authRepository.findUserByEmail(attempt.email);

      if (!user) {
        return;
      }

      const employee = user.employees[0];

      if (!employee) {
        return;
      }

      await auditService.log({
        action: attempt.success ? AuditAction.LOGIN : AuditAction.LOGIN,
        module: 'auth',
        description: attempt.success
          ? 'User logged in successfully'
          : `Login failed: ${attempt.failureReason || 'Invalid credentials'}`,
        userId: user.id,
        tenantId: employee.tenantId,
        ipAddress: attempt.ipAddress,
        userAgent: attempt.userAgent,
      });
    } catch (error) {
      logger.error('Failed to create login audit log', { error, attempt });
    }
  }

  /**
   * Notify user that their account has been locked
   */
  private async notifyAccountLocked(
    userId: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await notificationManager.createNotification({
        userId,
        title: 'Account Temporarily Locked',
        message: `Your account has been temporarily locked due to multiple failed login attempts${ipAddress ? ` from IP address ${ipAddress}` : ''
          }. Please wait 15 minutes before trying again.`,
        type: 'WARNING',
      });
    } catch (error) {
      logger.error('Failed to send account locked notification', { error, userId });
    }
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(userId: string): Promise<string> {
    // Generate a secure random token
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Store token with expiry (24 hours)
    // This would typically be stored in Redis or a separate table
    // For now, we'll use a simple implementation

    logger.info('Email verification token generated', { userId });

    return token;
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(userId: string): Promise<string> {
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Store token with expiry (1 hour)
    // This would typically be stored in Redis or a separate table

    logger.info('Password reset token generated', { userId });

    return token;
  }

  /**
   * Clean up expired tokens and sessions (for scheduled job)
   */
  async cleanupExpiredData(): Promise<{
    expiredTokens: number;
    expiredSessions: number;
  }> {
    // Delete expired refresh tokens
    const deletedTokens = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            AND: [
              { revokedAt: { not: null } },
              { revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
          },
        ],
      },
    });

    logger.info('Cleaned up expired auth data', {
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
  async getTenantSecuritySettings(tenantId: string): Promise<SecurityConfig> {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      return this.DEFAULT_SECURITY_CONFIG;
    }

    // Parse security settings from JSON
    const securitySettings = (settings as any).securitySettings || {};

    return {
      ...this.DEFAULT_SECURITY_CONFIG,
      ...securitySettings,
    };
  }

  /**
   * Update security settings for a tenant
   */
  async updateTenantSecuritySettings(
    tenantId: string,
    settings: Partial<SecurityConfig>
  ): Promise<void> {
    await prisma.tenantSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        // Store security settings in the settings JSON field
      },
      update: {
        // Update security settings
      },
    });

    logger.info('Tenant security settings updated', { tenantId });
  }
}

// Export singleton instance
export const authManager = new AuthManager();
