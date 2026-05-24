import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

const db = prisma as any;
const MAX_AUTOMATION_IDEMPOTENCY_RETRIES = Number(process.env.AUTOMATION_IDEMPOTENCY_MAX_RETRIES || 3);

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
    return existing?.status === 'COMPLETED' || existing?.status === 'STARTED' || existing?.status === 'PROCESSING';
  }

  async getByKey(tenantId: string, key: string) {
    if (!tenantId || !key) return null;
    return db.automationIdempotencyKey.findFirst({ where: { tenantId, key } });
  }

  async getById(tenantId: string, id: string) {
    if (!tenantId || !id) return null;
    return db.automationIdempotencyKey.findFirst({ where: { id, tenantId } });
  }

  async runOnce<T>(
    tenantId: string,
    key: string,
    meta: IdempotencyMeta,
    fn: () => Promise<T>,
  ): Promise<{ executed: boolean; result?: T; skippedReason?: string }> {
    if (!tenantId || !key) {
      return { executed: true, result: await fn() };
    }

    let isRetry = false;
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
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await this.getByKey(tenantId, key);
      if (!existing) return { executed: false, skippedReason: 'duplicate' };
      const status = String(existing.status || '').toUpperCase();
      if (status === 'COMPLETED') return { executed: false, skippedReason: 'duplicate' };
      if (status === 'STARTED' || status === 'PROCESSING') return { executed: false, skippedReason: 'in_progress' };
      if (status !== 'FAILED') return { executed: false, skippedReason: 'blocked' };

      const retryCount = Number(existing.retryCount || 0);
      if (retryCount >= MAX_AUTOMATION_IDEMPOTENCY_RETRIES) {
        return { executed: false, skippedReason: 'max_retries' };
      }

      const claimedRetry = await db.automationIdempotencyKey.updateMany({
        where: { tenantId, key, status: 'FAILED', retryCount: { lt: MAX_AUTOMATION_IDEMPOTENCY_RETRIES } },
        data: {
          status: 'STARTED',
          retryCount: { increment: 1 },
          lastRetriedAt: new Date(),
          error: null,
          result: { ...(meta.result || {}), retrying: true, previousError: existing.error || null },
        },
      });
      if (claimedRetry.count !== 1) return { executed: false, skippedReason: 'in_progress' };
      isRetry = true;
      logger.info('[AutomationIdempotency] Retrying failed automation idempotency key', {
        tenantId,
        key,
        retryCount: retryCount + 1,
      });
    }

    try {
      const result = await fn();
      await db.automationIdempotencyKey.update({
        where: { tenantId_key: { tenantId, key } },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: { ...(meta.result || {}), completed: true, retried: isRetry },
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

  async assertRetryAllowed(tenantId: string, id: string) {
    const key = await this.getById(tenantId, id);
    if (!key) {
      throw new NotFoundError('Automation idempotency key not found for this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    return this.assertKeyCanRetry(key);
  }

  async assertRetryAllowedByKey(tenantId: string, keyValue: string) {
    const key = await this.getByKey(tenantId, keyValue);
    if (!key) {
      throw new NotFoundError('Automation idempotency key not found for this tenant', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    return this.assertKeyCanRetry(key);
  }

  private assertKeyCanRetry(key: any) {
    if (String(key.status).toUpperCase() !== 'FAILED') {
      throw new BadRequestError('Only failed automation idempotency keys can be retried', ErrorCodes.VALIDATION_FAILED);
    }
    if (Number(key.retryCount || 0) >= MAX_AUTOMATION_IDEMPOTENCY_RETRIES) {
      throw new ConflictError('Automation retry limit has been reached for this key', ErrorCodes.VALIDATION_FAILED);
    }
    return key;
  }
}

export const automationIdempotencyService = new AutomationIdempotencyService();
