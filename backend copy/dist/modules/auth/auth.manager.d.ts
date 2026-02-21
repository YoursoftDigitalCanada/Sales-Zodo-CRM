/**
 * Auth Manager
 * Contains complex business logic, orchestration, and cross-cutting concerns
 * Separated from service to maintain single responsibility principle
 */
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
    preventReuse: number;
}
export interface SecurityConfig {
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutMinutes: number;
    requireMfa: boolean;
}
export declare class AuthManager {
    private readonly DEFAULT_PASSWORD_POLICY;
    private readonly DEFAULT_SECURITY_CONFIG;
    private loginAttempts;
    /**
     * Check if user account is locked due to failed login attempts
     */
    checkAccountLockout(email: string): Promise<void>;
    /**
     * Record a login attempt
     */
    recordLoginAttempt(attempt: LoginAttempt): Promise<void>;
    /**
     * Validate password against policy
     */
    validatePasswordPolicy(password: string, policy?: PasswordPolicy): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Check if password was recently used (prevent password reuse)
     */
    checkPasswordHistory(userId: string, newPasswordHash: string, historyCount?: number): Promise<boolean>;
    /**
     * Validate tenant access for a user
     */
    validateTenantAccess(userId: string, tenantId: string): Promise<void>;
    /**
     * Get user's permissions for a specific tenant
     */
    getUserPermissions(userId: string, tenantId: string): Promise<string[]>;
    /**
     * Check if user has a specific permission
     */
    hasPermission(userId: string, tenantId: string, permissionCode: string): Promise<boolean>;
    /**
     * Check if user has any of the specified permissions
     */
    hasAnyPermission(userId: string, tenantId: string, permissionCodes: string[]): Promise<boolean>;
    /**
     * Check if user has all of the specified permissions
     */
    hasAllPermissions(userId: string, tenantId: string, permissionCodes: string[]): Promise<boolean>;
    /**
     * Get user's role in a tenant
     */
    getUserRole(userId: string, tenantId: string): Promise<string | null>;
    /**
     * Check if user is an owner of the tenant
     */
    isOwner(userId: string, tenantId: string): Promise<boolean>;
    /**
     * Check if user is an admin of the tenant
     */
    isAdmin(userId: string, tenantId: string): Promise<boolean>;
    /**
     * Get active sessions for a user
     */
    getActiveSessions(userId: string): Promise<any[]>;
    /**
     * Revoke a specific session
     */
    revokeSession(userId: string, sessionId: string): Promise<void>;
    /**
     * Create audit log for login attempt
     */
    private createLoginAuditLog;
    /**
     * Notify user that their account has been locked
     */
    private notifyAccountLocked;
    /**
     * Generate email verification token
     */
    generateEmailVerificationToken(userId: string): Promise<string>;
    /**
     * Generate password reset token
     */
    generatePasswordResetToken(userId: string): Promise<string>;
    /**
     * Clean up expired tokens and sessions (for scheduled job)
     */
    cleanupExpiredData(): Promise<{
        expiredTokens: number;
        expiredSessions: number;
    }>;
    /**
     * Get security settings for a tenant
     */
    getTenantSecuritySettings(tenantId: string): Promise<SecurityConfig>;
    /**
     * Update security settings for a tenant
     */
    updateTenantSecuritySettings(tenantId: string, settings: Partial<SecurityConfig>): Promise<void>;
}
export declare const authManager: AuthManager;
//# sourceMappingURL=auth.manager.d.ts.map