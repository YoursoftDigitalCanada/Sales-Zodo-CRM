import { prisma } from '../../config/database';

class BookkeepingAuditService {
  async log(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string;
    beforeValue?: any;
    afterValue?: any;
    aiResponse?: any;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await prisma.bookkeepingAuditLog.create({
        data: {
          tenantId: params.tenantId,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          beforeValue: params.beforeValue || undefined,
          afterValue: params.afterValue || undefined,
          aiResponse: params.aiResponse || undefined,
          userId: params.userId || undefined,
          metadata: params.metadata || {},
        },
      });
    } catch (error) {
      console.error('Failed to write bookkeeping audit log:', error);
    }
  }

  async getAuditLog(tenantId: string, query: {
    entityType?: string;
    entityId?: string;
    action?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action;

    const [data, total] = await Promise.all([
      prisma.bookkeepingAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bookkeepingAuditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }
}

export const bookkeepingAuditService = new BookkeepingAuditService();
