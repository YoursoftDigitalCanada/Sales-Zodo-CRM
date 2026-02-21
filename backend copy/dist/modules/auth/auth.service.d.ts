import { LoginInput, RegisterInput, AuthResponse, TokenResponse, ChangePasswordInput } from './auth.types';
export declare class AuthService {
    /**
     * Login user with email and password
     */
    login(input: LoginInput, metadata: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<AuthResponse>;
    /**
     * Register a new user and optionally create a new tenant
     */
    register(input: RegisterInput): Promise<AuthResponse>;
    /**
     * Refresh access token using refresh token
     */
    refreshToken(refreshToken: string, metadata: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<TokenResponse>;
    /**
     * Logout user by revoking refresh token
     */
    logout(refreshToken: string): Promise<void>;
    /**
     * Logout from all devices
     */
    logoutAll(userId: string): Promise<void>;
    /**
     * Change password
     */
    changePassword(userId: string, input: ChangePasswordInput): Promise<void>;
    /**
     * Get current user profile with permissions and sidebar modules
     */
    getProfile(userId: string, tenantId: string): Promise<any>;
    /**
     * Switch tenant for users with multiple tenant memberships
     */
    switchTenant(userId: string, targetTenantId: string, metadata: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<AuthResponse>;
    /**
     * Get list of tenants user has access to
     */
    getUserTenants(userId: string): Promise<any[]>;
    /**
     * Verify email address (for email verification flow)
     */
    verifyEmail(token: string): Promise<void>;
    /**
     * Request password reset
     */
    forgotPassword(email: string): Promise<void>;
    /**
     * Reset password using reset token
     */
    resetPassword(token: string, newPassword: string): Promise<void>;
    /**
     * Generate access and refresh tokens
     */
    private generateTokens;
    /**
     * Generate URL-safe slug from string
     */
    private generateSlug;
    /**
     * Clean up expired refresh tokens (for scheduled job)
     */
    cleanupExpiredTokens(): Promise<number>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map