"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = exports.AuthRepository = void 0;
const database_1 = require("../../config/database");
class AuthRepository {
    async findUserByEmail(email) {
        return database_1.prisma.user.findUnique({
            where: { email },
            include: {
                employees: {
                    where: { isActive: true },
                    include: {
                        tenant: true,
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
                },
            },
        });
    }
    async findUserById(userId) {
        return database_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                employees: {
                    where: { isActive: true },
                    include: {
                        tenant: true,
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
                },
            },
        });
    }
    async createUser(data) {
        return database_1.prisma.user.create({
            data,
        });
    }
    async updateUser(userId, data) {
        return database_1.prisma.user.update({
            where: { id: userId },
            data,
        });
    }
    async createRefreshToken(data) {
        return database_1.prisma.refreshToken.create({
            data,
        });
    }
    async findRefreshToken(token) {
        return database_1.prisma.refreshToken.findUnique({
            where: { token },
            include: {
                user: {
                    include: {
                        employees: {
                            where: { isActive: true },
                            include: {
                                tenant: true,
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
                        },
                    },
                },
            },
        });
    }
    async revokeRefreshToken(token, replacedBy) {
        return database_1.prisma.refreshToken.update({
            where: { token },
            data: {
                revokedAt: new Date(),
                replacedBy,
            },
        });
    }
    async revokeAllUserRefreshTokens(userId) {
        return database_1.prisma.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }
    async deleteExpiredRefreshTokens() {
        return database_1.prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { revokedAt: { not: null } },
                ],
            },
        });
    }
    async findEmployeeWithPermissions(userId, tenantId) {
        return database_1.prisma.employee.findUnique({
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
                tenant: true,
            },
        });
    }
}
exports.AuthRepository = AuthRepository;
exports.authRepository = new AuthRepository();
//# sourceMappingURL=auth.repository.js.map