import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        employees: {
          where: { isActive: true },
          include: {
            tenant: {
              include: {
                subscription: true,
              },
            },
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

  async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        employees: {
          where: { isActive: true },
          include: {
            tenant: {
              include: {
                subscription: true,
              },
            },
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

  async createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
    });
  }

  async updateUser(userId: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async createRefreshToken(data: {
    id?: string;
    token: string;
    userId: string;
    expiresAt: Date;
    lastSeenAt?: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.refreshToken.create({
      data,
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            employees: {
              where: { isActive: true },
              include: {
                tenant: {
                  include: {
                    subscription: true,
                  },
                },
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

  async revokeRefreshToken(token: string, replacedBy?: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: {
        revokedAt: new Date(),
        replacedBy,
      },
    });
  }

  async findRefreshTokenById(id: string) {
    return prisma.refreshToken.findUnique({
      where: { id },
    });
  }

  async touchRefreshToken(id: string, expiresAt: Date) {
    return prisma.refreshToken.updateMany({
      where: {
        id,
        revokedAt: null,
      },
      data: {
        lastSeenAt: new Date(),
        expiresAt,
      },
    });
  }

  async scheduleForcedLogoutForOtherSessions(
    userId: string,
    currentSessionId: string,
    forceLogoutAt: Date,
    reason: string,
  ) {
    return prisma.refreshToken.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        warningIssuedAt: new Date(),
        forceLogoutAt,
        revokedReason: reason,
      },
    });
  }

  async revokeRefreshTokenById(id: string, reason?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  async revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
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
    return prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
  }

  async findEmployeeWithPermissions(userId: string, tenantId: string) {
    return prisma.employee.findUnique({
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
        tenant: {
          include: {
            subscription: true,
          },
        },
      },
    });
  }
}

export const authRepository = new AuthRepository();
