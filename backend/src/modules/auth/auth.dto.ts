/**
 * Auth Data Transfer Objects
 * Used for API request/response shaping and documentation
 */

// ============================================================================
// REQUEST DTOs
// ============================================================================

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

// ============================================================================
// RESPONSE DTOs
// ============================================================================

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

// ============================================================================
// MAPPER FUNCTIONS
// ============================================================================

import { User, Employee, Tenant, Role } from '@prisma/client';

export function toUserDto(user: User): UserDto {
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

export function toUserProfileDto(user: User): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar || undefined,
    phone: user.phone || undefined,
  };
}

export function toRoleDto(role: Role): RoleDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description || undefined,
    isSystemRole: role.isSystemRole,
  };
}

export function toTenantDto(tenant: Tenant): TenantDto {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logo: tenant.logo || undefined,
    status: tenant.status,
  };
}

export function toTenantProfileDto(tenant: Tenant): TenantProfileDto {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logo: tenant.logo || undefined,
  };
}

export function toEmployeeProfileDto(
  employee: Employee & { role: Role }
): EmployeeProfileDto {
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

export function toTokenResponseDto(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): TokenResponseDto {
  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
  };
}

export function toAuthResponseDto(
  user: User,
  employee: Employee & { role: Role; tenant: Tenant },
  tokens: TokenResponseDto,
  permissions: string[],
  sidebarModules: string[]
): AuthResponseDto {
  return {
    user: toUserProfileDto(user),
    employee: toEmployeeProfileDto(employee),
    tenant: toTenantProfileDto(employee.tenant),
    tokens,
    permissions,
    sidebarModules,
  };
}

export function toTenantListItemDto(
  employee: Employee & { role: Role; tenant: Tenant }
): TenantListItemDto {
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

export const AuthSwaggerSchemas = {
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