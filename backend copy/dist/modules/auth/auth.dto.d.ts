/**
 * Auth Data Transfer Objects
 * Used for API request/response shaping and documentation
 */
export interface LoginRequestDto {
    email: string;
    password: string;
}
export interface RegisterRequestDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantName?: string;
    tenantSlug?: string;
}
export interface RefreshTokenRequestDto {
    refreshToken: string;
}
export interface ChangePasswordRequestDto {
    currentPassword: string;
    newPassword: string;
}
export interface ForgotPasswordRequestDto {
    email: string;
}
export interface ResetPasswordRequestDto {
    token: string;
    password: string;
}
export interface VerifyEmailRequestDto {
    token: string;
}
export interface SwitchTenantRequestDto {
    tenantId: string;
}
export interface UserDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    phone?: string;
    status: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserProfileDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    phone?: string;
}
export interface EmployeeDto {
    id: string;
    employeeNumber?: string;
    department?: string;
    position?: string;
    hireDate?: Date;
    isActive: boolean;
    role: RoleDto;
}
export interface EmployeeProfileDto {
    id: string;
    employeeNumber?: string;
    department?: string;
    position?: string;
    role: {
        id: string;
        name: string;
    };
}
export interface RoleDto {
    id: string;
    name: string;
    description?: string;
    isSystemRole: boolean;
}
export interface TenantDto {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    status: string;
}
export interface TenantProfileDto {
    id: string;
    name: string;
    slug: string;
    logo?: string;
}
export interface TokenResponseDto {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
}
export interface AuthResponseDto {
    user: UserProfileDto;
    employee?: EmployeeProfileDto;
    tenant?: TenantProfileDto;
    tokens: TokenResponseDto;
    permissions: string[];
    sidebarModules: string[];
}
export interface ProfileResponseDto {
    user: UserProfileDto;
    employee: EmployeeProfileDto;
    tenant: TenantProfileDto;
    permissions: string[];
    sidebarModules: string[];
}
export interface TenantListItemDto {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    tenantLogo?: string;
    role: string;
    employeeId: string;
}
export interface SessionDto {
    id: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
    expiresAt: Date;
    isCurrent: boolean;
}
import { User, Employee, Tenant, Role } from '@prisma/client';
export declare function toUserDto(user: User): UserDto;
export declare function toUserProfileDto(user: User): UserProfileDto;
export declare function toRoleDto(role: Role): RoleDto;
export declare function toTenantDto(tenant: Tenant): TenantDto;
export declare function toTenantProfileDto(tenant: Tenant): TenantProfileDto;
export declare function toEmployeeProfileDto(employee: Employee & {
    role: Role;
}): EmployeeProfileDto;
export declare function toTokenResponseDto(accessToken: string, refreshToken: string, expiresIn: number): TokenResponseDto;
export declare function toAuthResponseDto(user: User, employee: Employee & {
    role: Role;
    tenant: Tenant;
}, tokens: TokenResponseDto, permissions: string[], sidebarModules: string[]): AuthResponseDto;
export declare function toTenantListItemDto(employee: Employee & {
    role: Role;
    tenant: Tenant;
}): TenantListItemDto;
export declare const AuthSwaggerSchemas: {
    LoginRequest: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
                example: string;
            };
            password: {
                type: string;
                format: string;
                example: string;
            };
        };
    };
    RegisterRequest: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
                example: string;
            };
            password: {
                type: string;
                format: string;
                minLength: number;
                example: string;
            };
            firstName: {
                type: string;
                example: string;
            };
            lastName: {
                type: string;
                example: string;
            };
            tenantName: {
                type: string;
                example: string;
            };
            tenantSlug: {
                type: string;
                example: string;
            };
        };
    };
    RefreshTokenRequest: {
        type: string;
        required: string[];
        properties: {
            refreshToken: {
                type: string;
                example: string;
            };
        };
    };
    ChangePasswordRequest: {
        type: string;
        required: string[];
        properties: {
            currentPassword: {
                type: string;
                format: string;
            };
            newPassword: {
                type: string;
                format: string;
                minLength: number;
            };
        };
    };
    AuthResponse: {
        type: string;
        properties: {
            success: {
                type: string;
                example: boolean;
            };
            message: {
                type: string;
                example: string;
            };
            data: {
                type: string;
                properties: {
                    user: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                                format: string;
                            };
                            email: {
                                type: string;
                                format: string;
                            };
                            firstName: {
                                type: string;
                            };
                            lastName: {
                                type: string;
                            };
                            avatar: {
                                type: string;
                                nullable: boolean;
                            };
                        };
                    };
                    employee: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                                format: string;
                            };
                            role: {
                                type: string;
                                properties: {
                                    id: {
                                        type: string;
                                        format: string;
                                    };
                                    name: {
                                        type: string;
                                    };
                                };
                            };
                            department: {
                                type: string;
                                nullable: boolean;
                            };
                            position: {
                                type: string;
                                nullable: boolean;
                            };
                        };
                    };
                    tenant: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                                format: string;
                            };
                            name: {
                                type: string;
                            };
                            slug: {
                                type: string;
                            };
                        };
                    };
                    tokens: {
                        type: string;
                        properties: {
                            accessToken: {
                                type: string;
                            };
                            refreshToken: {
                                type: string;
                            };
                            expiresIn: {
                                type: string;
                                example: number;
                            };
                            tokenType: {
                                type: string;
                                example: string;
                            };
                        };
                    };
                    permissions: {
                        type: string;
                        items: {
                            type: string;
                        };
                        example: string[];
                    };
                    sidebarModules: {
                        type: string;
                        items: {
                            type: string;
                        };
                        example: string[];
                    };
                };
            };
        };
    };
    TokenResponse: {
        type: string;
        properties: {
            success: {
                type: string;
                example: boolean;
            };
            data: {
                type: string;
                properties: {
                    accessToken: {
                        type: string;
                    };
                    refreshToken: {
                        type: string;
                    };
                    expiresIn: {
                        type: string;
                        example: number;
                    };
                    tokenType: {
                        type: string;
                        example: string;
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=auth.dto.d.ts.map