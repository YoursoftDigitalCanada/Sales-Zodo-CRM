"use strict";
/**
 * Auth Data Transfer Objects
 * Used for API request/response shaping and documentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthSwaggerSchemas = void 0;
exports.toUserDto = toUserDto;
exports.toUserProfileDto = toUserProfileDto;
exports.toRoleDto = toRoleDto;
exports.toTenantDto = toTenantDto;
exports.toTenantProfileDto = toTenantProfileDto;
exports.toEmployeeProfileDto = toEmployeeProfileDto;
exports.toTokenResponseDto = toTokenResponseDto;
exports.toAuthResponseDto = toAuthResponseDto;
exports.toTenantListItemDto = toTenantListItemDto;
function toUserDto(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar || undefined,
        phone: user.phone || undefined,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
function toUserProfileDto(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar || undefined,
        phone: user.phone || undefined,
    };
}
function toRoleDto(role) {
    return {
        id: role.id,
        name: role.name,
        description: role.description || undefined,
        isSystemRole: role.isSystemRole,
    };
}
function toTenantDto(tenant) {
    return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo || undefined,
        status: tenant.status,
    };
}
function toTenantProfileDto(tenant) {
    return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo || undefined,
    };
}
function toEmployeeProfileDto(employee) {
    return {
        id: employee.id,
        employeeNumber: employee.employeeNumber || undefined,
        department: employee.department || undefined,
        position: employee.position || undefined,
        role: {
            id: employee.role.id,
            name: employee.role.name,
        },
    };
}
function toTokenResponseDto(accessToken, refreshToken, expiresIn) {
    return {
        accessToken,
        refreshToken,
        expiresIn,
        tokenType: 'Bearer',
    };
}
function toAuthResponseDto(user, employee, tokens, permissions, sidebarModules) {
    return {
        user: toUserProfileDto(user),
        employee: toEmployeeProfileDto(employee),
        tenant: toTenantProfileDto(employee.tenant),
        tokens,
        permissions,
        sidebarModules,
    };
}
function toTenantListItemDto(employee) {
    return {
        tenantId: employee.tenant.id,
        tenantName: employee.tenant.name,
        tenantSlug: employee.tenant.slug,
        tenantLogo: employee.tenant.logo || undefined,
        role: employee.role.name,
        employeeId: employee.id,
    };
}
// ============================================================================
// API DOCUMENTATION SCHEMAS (for Swagger)
// ============================================================================
exports.AuthSwaggerSchemas = {
    LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                example: 'john@example.com',
            },
            password: {
                type: 'string',
                format: 'password',
                example: 'SecurePass123!',
            },
        },
    },
    RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                example: 'john@example.com',
            },
            password: {
                type: 'string',
                format: 'password',
                minLength: 8,
                example: 'SecurePass123!',
            },
            firstName: {
                type: 'string',
                example: 'John',
            },
            lastName: {
                type: 'string',
                example: 'Doe',
            },
            tenantName: {
                type: 'string',
                example: 'Acme Corporation',
            },
            tenantSlug: {
                type: 'string',
                example: 'acme-corp',
            },
        },
    },
    RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
        },
    },
    ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
            currentPassword: {
                type: 'string',
                format: 'password',
            },
            newPassword: {
                type: 'string',
                format: 'password',
                minLength: 8,
            },
        },
    },
    AuthResponse: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
                type: 'object',
                properties: {
                    user: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            email: { type: 'string', format: 'email' },
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            avatar: { type: 'string', nullable: true },
                        },
                    },
                    employee: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            role: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string' },
                                },
                            },
                            department: { type: 'string', nullable: true },
                            position: { type: 'string', nullable: true },
                        },
                    },
                    tenant: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            slug: { type: 'string' },
                        },
                    },
                    tokens: {
                        type: 'object',
                        properties: {
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                            expiresIn: { type: 'integer', example: 900 },
                            tokenType: { type: 'string', example: 'Bearer' },
                        },
                    },
                    permissions: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['leads.view', 'leads.create', 'clients.view'],
                    },
                    sidebarModules: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['dashboard', 'leads', 'clients', 'tasks'],
                    },
                },
            },
        },
    },
    TokenResponse: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: true },
            data: {
                type: 'object',
                properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'integer', example: 900 },
                    tokenType: { type: 'string', example: 'Bearer' },
                },
            },
        },
    },
};
//# sourceMappingURL=auth.dto.js.map