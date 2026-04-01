import bcrypt from 'bcryptjs';
import { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { type CreateUserDto, type UpdateUserDto, type UserQueryDto } from './users.dto';

const tenantMembershipInclude = (tenantId: string) => ({
  employees: {
    where: { tenantId },
    select: {
      id: true,
      isActive: true,
      department: true,
      position: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
});

export class UsersRepository {
  async findRoleById(roleId: string, tenantId: string) {
    return prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async findDefaultRole(tenantId: string) {
    return prisma.role.findFirst({
      where: {
        tenantId,
        isDefault: true,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async createWithMembership(data: CreateUserDto, tenantId: string) {
    const hashedPassword = await bcrypt.hash(data.password || '', 10);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email: data.email.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          status: 'ACTIVE',
          emailVerified: true,
          employees: data.roleId
            ? {
                create: {
                  tenantId,
                  roleId: data.roleId,
                  department: data.department || null,
                  position: data.position || null,
                  isActive: true,
                },
              }
            : undefined,
          userPreferences: {
            create: {},
          },
        },
        include: tenantMembershipInclude(tenantId),
      });

      return user;
    });
  }

  async findById(id: string, tenantId: string) {
    return prisma.user.findFirst({
      where: {
        id,
        employees: {
          some: { tenantId },
        },
      },
      include: tenantMembershipInclude(tenantId),
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findMany(query: UserQueryDto, tenantId: string) {
    const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: Prisma.UserWhereInput = {
      employees: {
        some: { tenantId },
      },
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: tenantMembershipInclude(tenantId),
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, tenantId: string, data: UpdateUserDto) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
          ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });

      if (data.department !== undefined || data.position !== undefined) {
        await tx.employee.updateMany({
          where: {
            tenantId,
            userId: id,
          },
          data: {
            ...(data.department !== undefined ? { department: data.department } : {}),
            ...(data.position !== undefined ? { position: data.position } : {}),
          },
        });
      }
    });

    return this.findById(id, tenantId);
  }

  async updateStatus(id: string, tenantId: string, status: UserStatus) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { status },
      });

      await tx.employee.updateMany({
        where: {
          tenantId,
          userId: id,
        },
        data: {
          isActive: status === 'ACTIVE' || status === 'PENDING_VERIFICATION',
        },
      });
    });

    return this.findById(id, tenantId);
  }

  async updateRole(id: string, tenantId: string, roleId: string) {
    await prisma.employee.updateMany({
      where: {
        tenantId,
        userId: id,
      },
      data: { roleId },
    });

    return this.findById(id, tenantId);
  }

  async deactivateMembership(id: string, tenantId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.employee.updateMany({
        where: {
          tenantId,
          userId: id,
        },
        data: {
          isActive: false,
        },
      });

      await tx.user.update({
        where: { id },
        data: {
          status: 'INACTIVE',
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    });
  }
}

export const usersRepository = new UsersRepository();
