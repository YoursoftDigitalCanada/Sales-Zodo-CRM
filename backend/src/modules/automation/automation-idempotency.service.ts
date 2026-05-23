import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

const db = prisma as any;

type IdempotencyMeta = {
  eventName?: string;
  entityType?: string;
  entityId?: string;
  actionType: string;
  result?: Record<string, any>;
};

function isUniqueConstraintError(error: any) {
  return error?.code === 'P2002' || /unique constraint/i.test(String(error?.message || error));
}

class AutomationIdempotencyService {
  buildKey(tenantId: string, eventName: string, entityType: string, entityId: string, actionType: string) {
    return [tenantId, eventName, entityType, entityId, actionType]
      .map((part) => String(part || '').trim())
      .join(':');
  }

  async hasRun(tenantId: string, key: string) {
    if (!tenantId || !key) return false;
    const existing = await db.automationIdempotencyKey.findFirst({ where: { tenantId, key } });
    return Boolean(existing);
  }

  async runOnce<T>(tenantId: string, key: string, meta: IdempotencyMeta, fn: () => Promise<T>): Promise<{ executed: boolean; result?: T }> {
    if (!tenantId || !key) {
      return { executed: true, result: await fn() };
    }

    try {
      await db.automationIdempotencyKey.create({
        data: {
          tenantId,
          key,
          eventName: meta.eventName || null,
          entityType: meta.entityType || null,
          entityId: meta.entityId || null,
          actionType: meta.actionType,
          status: 'STARTED',
          result: meta.result || {},
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return { executed: false };
      throw error;
    }

    try {
      const result = await fn();
      await db.automationIdempotencyKey.update({
        where: { tenantId_key: { tenantId, key } },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: { ...(meta.result || {}), completed: true },
          error: null,
        },
      }).catch((error: any) => logger.warn('[AutomationIdempotency] Failed to mark key completed', { tenantId, key, error }));
      return { executed: true, result };
    } catch (error) {
      await db.automationIdempotencyKey.update({
        where: { tenantId_key: { tenantId, key } },
        data: {
          status: 'FAILED',
          error: (error as Error)?.message || String(error),
        },
      }).catch((updateError: any) => logger.warn('[AutomationIdempotency] Failed to mark key failed', { tenantId, key, updateError }));
      throw error;
    }
  }
}

export const automationIdempotencyService = new AutomationIdempotencyService();
