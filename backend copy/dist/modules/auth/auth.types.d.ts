export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantName?: string;
    tenantSlug?: string;
}
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
}
export interface AuthResponse {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        avatar?: string;
    };
    employee?: {
        id: string;
        role: {
            id: string;
            name: string;
        };
        department?: string;
        position?: string;
    };
    tenant?: {
        id: string;
        name: string;
        slug: string;
    };
    tokens: TokenResponse;
    permissions: string[];
    sidebarModules: string[];
}
export interface RefreshTokenRequest {
    refreshToken: string;
}
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export type { LoginInput, RegisterInput, RefreshTokenInput, ChangePasswordInput } from './auth.validators';
//# sourceMappingURL=auth.types.d.ts.map