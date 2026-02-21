import { Prisma } from '@prisma/client';
export declare class AuthRepository {
    findUserByEmail(email: string): Promise<({
        employees: ({
            tenant: {
                status: import(".prisma/client").$Enums.TenantStatus;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                slug: string;
                domain: string | null;
                logo: string | null;
                settings: Prisma.JsonValue;
                fileStorageQuota: bigint;
                fileStorageUsed: bigint;
                emailStorageQuota: bigint;
                emailStorageUsed: bigint;
                subscriptionTier: string;
                subscriptionExpiresAt: Date | null;
            };
            role: {
                permissions: ({
                    permission: {
                        code: string;
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        description: string | null;
                        module: string;
                        action: string;
                    };
                } & {
                    id: string;
                    roleId: string;
                    createdAt: Date;
                    permissionId: string;
                    constraints: Prisma.JsonValue | null;
                })[];
            } & {
                tenantId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                isSystemRole: boolean;
                isDefault: boolean;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        status: import(".prisma/client").$Enums.UserStatus;
        email: string;
        tenantId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        passwordHash: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        phone: string | null;
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        lastLoginAt: Date | null;
        passwordChangedAt: Date | null;
        preferences: Prisma.JsonValue;
    }) | null>;
    findUserById(userId: string): Promise<({
        employees: ({
            tenant: {
                status: import(".prisma/client").$Enums.TenantStatus;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                slug: string;
                domain: string | null;
                logo: string | null;
                settings: Prisma.JsonValue;
                fileStorageQuota: bigint;
                fileStorageUsed: bigint;
                emailStorageQuota: bigint;
                emailStorageUsed: bigint;
                subscriptionTier: string;
                subscriptionExpiresAt: Date | null;
            };
            role: {
                permissions: ({
                    permission: {
                        code: string;
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        description: string | null;
                        module: string;
                        action: string;
                    };
                } & {
                    id: string;
                    roleId: string;
                    createdAt: Date;
                    permissionId: string;
                    constraints: Prisma.JsonValue | null;
                })[];
            } & {
                tenantId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                isSystemRole: boolean;
                isDefault: boolean;
            };
        } & {
            userId: string;
            tenantId: string;
            id: string;
            employeeNumber: string | null;
            department: string | null;
            position: string | null;
            hireDate: Date | null;
            isActive: boolean;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
        })[];
    } & {
        status: import(".prisma/client").$Enums.UserStatus;
        email: string;
        tenantId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        passwordHash: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        phone: string | null;
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        lastLoginAt: Date | null;
        passwordChangedAt: Date | null;
        preferences: Prisma.JsonValue;
    }) | null>;
    createUser(data: Prisma.UserCreateInput): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        email: string;
        tenantId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        passwordHash: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        phone: string | null;
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        lastLoginAt: Date | null;
        passwordChangedAt: Date | null;
        preferences: Prisma.JsonValue;
    }>;
    updateUser(userId: string, data: Prisma.UserUpdateInput): Promise<{
        status: import(".prisma/client").$Enums.UserStatus;
        email: string;
        tenantId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        passwordHash: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        phone: string | null;
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        lastLoginAt: Date | null;
        passwordChangedAt: Date | null;
        preferences: Prisma.JsonValue;
    }>;
    createRefreshToken(data: {
        token: string;
        userId: string;
        expiresAt: Date;
        userAgent?: string;
        ipAddress?: string;
    }): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        token: string;
        expiresAt: Date;
        revokedAt: Date | null;
        replacedBy: string | null;
        userAgent: string | null;
        ipAddress: string | null;
    }>;
    findRefreshToken(token: string): Promise<({
        user: {
            employees: ({
                tenant: {
                    status: import(".prisma/client").$Enums.TenantStatus;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    slug: string;
                    domain: string | null;
                    logo: string | null;
                    settings: Prisma.JsonValue;
                    fileStorageQuota: bigint;
                    fileStorageUsed: bigint;
                    emailStorageQuota: bigint;
                    emailStorageUsed: bigint;
                    subscriptionTier: string;
                    subscriptionExpiresAt: Date | null;
                };
                role: {
                    permissions: ({
                        permission: {
                            code: string;
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            name: string;
                            description: string | null;
                            module: string;
                            action: string;
                        };
                    } & {
                        id: string;
                        roleId: string;
                        createdAt: Date;
                        permissionId: string;
                        constraints: Prisma.JsonValue | null;
                    })[];
                } & {
                    tenantId: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    description: string | null;
                    isSystemRole: boolean;
                    isDefault: boolean;
                };
            } & {
                userId: string;
                tenantId: string;
                id: string;
                employeeNumber: string | null;
                department: string | null;
                position: string | null;
                hireDate: Date | null;
                isActive: boolean;
                roleId: string;
                createdAt: Date;
                updatedAt: Date;
            })[];
        } & {
            status: import(".prisma/client").$Enums.UserStatus;
            email: string;
            tenantId: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            passwordHash: string;
            firstName: string;
            lastName: string;
            avatar: string | null;
            phone: string | null;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
            lastLoginAt: Date | null;
            passwordChangedAt: Date | null;
            preferences: Prisma.JsonValue;
        };
    } & {
        userId: string;
        id: string;
        createdAt: Date;
        token: string;
        expiresAt: Date;
        revokedAt: Date | null;
        replacedBy: string | null;
        userAgent: string | null;
        ipAddress: string | null;
    }) | null>;
    revokeRefreshToken(token: string, replacedBy?: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        token: string;
        expiresAt: Date;
        revokedAt: Date | null;
        replacedBy: string | null;
        userAgent: string | null;
        ipAddress: string | null;
    }>;
    revokeAllUserRefreshTokens(userId: string): Promise<Prisma.BatchPayload>;
    deleteExpiredRefreshTokens(): Promise<Prisma.BatchPayload>;
    findEmployeeWithPermissions(userId: string, tenantId: string): Promise<({
        tenant: {
            status: import(".prisma/client").$Enums.TenantStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            domain: string | null;
            logo: string | null;
            settings: Prisma.JsonValue;
            fileStorageQuota: bigint;
            fileStorageUsed: bigint;
            emailStorageQuota: bigint;
            emailStorageUsed: bigint;
            subscriptionTier: string;
            subscriptionExpiresAt: Date | null;
        };
        role: {
            permissions: ({
                permission: {
                    code: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    description: string | null;
                    module: string;
                    action: string;
                };
            } & {
                id: string;
                roleId: string;
                createdAt: Date;
                permissionId: string;
                constraints: Prisma.JsonValue | null;
            })[];
        } & {
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            isSystemRole: boolean;
            isDefault: boolean;
        };
    } & {
        userId: string;
        tenantId: string;
        id: string;
        employeeNumber: string | null;
        department: string | null;
        position: string | null;
        hireDate: Date | null;
        isActive: boolean;
        roleId: string;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
}
export declare const authRepository: AuthRepository;
//# sourceMappingURL=auth.repository.d.ts.map