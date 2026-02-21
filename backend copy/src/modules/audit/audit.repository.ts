import { prisma } from '../../config/database';
import { AuditAction, Prisma } from '@prisma/client';
import { CreateAuditLogDto, AuditLogQueryDto } from './audit.dto';

export class AuditRepository {
  /**
   * Create audit log entry
   */
  async create(data: CreateAuditLogDto) {
    return prisma.auditLog.create({
      data: {
        action: data.action,
        module: data.module,
        description: data.description,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValues: data.oldValues as Prisma.JsonObject,
        newValues: data.newValues as Prisma.JsonObject,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestMethod: data.requestMethod,
        requestPath: data.requestPath,
        userId: data.userId,
        tenantId: data.tenantId,
      },
    });
  }

  /**
   * Create multiple audit log entries
   */
  async createMany(logs: CreateAuditLogDto[]) {
    return prisma.auditLog.createMany({
      data: logs.map((log) => ({
        action: log.action,
        module: log.module,
        description: log.description,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues as Prisma.JsonObject,
        newValues: log.newValues as Prisma.JsonObject,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        requestMethod: log.requestMethod,
        requestPath: log.requestPath,
        userId: log.userId,
        tenantId: log.tenantId,
      })),
    });
  }

  /**
   * Find audit logs with filters
   */
  async findMany(tenantId: string, query: AuditLogQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      action,
      module,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      search,
    } = query;

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(action && { action }),
      ...(module && { module }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { module: { contains: search, mode: 'insensitive' } },
          { entityType: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Find audit log by ID
   */
  async findById(id: string, tenantId: string) {
    return prisma.auditLog.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find audit logs for a specific entity
   */
  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit: number = 50
  ) {
    return prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete old audit logs (for cleanup job)
   */
  async deleteOlderThan(tenantId: string, date: Date) {
    return prisma.auditLog.deleteMany({
      where: {
        tenantId,
        createdAt: { lt: date },
      },
    });
  }

  /**
   * Get audit statistics
   */
  async getStatistics(tenantId: string, startDate: Date, endDate: Date) {
    const [byAction, byModule, byUser] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { action: true },
      }),
      prisma.auditLog.groupBy({
        by: ['module'],
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { module: true },
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
          userId: { not: null },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return { byAction, byModule, byUser };
  }
}

export const auditRepository = new AuditRepository();