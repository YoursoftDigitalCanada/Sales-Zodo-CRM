import { prisma } from '../../config/database';
import { activityLogger } from '../../common/services/activity-logger.service';
import { logger } from '../../common/utils/logger';
import { automationIdempotencyService } from './automation-idempotency.service';

const db = prisma as any;

type AutomationSideEffectInput = {
  tenantId: string;
  eventName: string;
  entityType: string;
  entityId: string;
  actionType: string;
  module?: string;
  input?: Record<string, any>;
};

type TenantSettings = {
  enabledModules?: unknown;
  plan?: unknown;
  uiFeatures?: unknown;
};

function errorMessage(error: unknown) {
  return (error as Error)?.message || String(error);
}

function compactResult(result: any) {
  if (!result || typeof result !== 'object') return result ?? null;
  return {
    id: result.id || null,
    status: result.status || null,
    type: result.type || result.entityType || null,
  };
}

class AutomationOrchestratorService {
  buildKey(input: AutomationSideEffectInput) {
    return automationIdempotencyService.buildKey(input.tenantId, input.eventName, input.entityType, input.entityId, input.actionType);
  }

  async isModuleEnabled(tenantId: string, module?: string) {
    if (!module) return true;
    const tenant = await db.tenant?.findUnique?.({ where: { id: tenantId }, select: { settings: true } });
    const settings = (tenant?.settings || {}) as TenantSettings;
    const enabledModules = settings.enabledModules;
    if (!Array.isArray(enabledModules)) return true;
    return enabledModules.includes(module);
  }

  async runSideEffect<T>(input: AutomationSideEffectInput, fn: () => Promise<T>): Promise<{ executed: boolean; result?: T; skippedReason?: string }> {
    const idempotencyKey = this.buildKey(input);
    const baseRun = {
      tenantId: input.tenantId,
      triggerType: input.eventName,
      entityType: input.entityType,
      entityId: input.entityId,
      input: { ...(input.input || {}), module: input.module || null, actionType: input.actionType, idempotencyKey },
    };

    const moduleEnabled = await this.isModuleEnabled(input.tenantId, input.module);
    if (!moduleEnabled) {
      await db.salesAutomationRun.create({
        data: {
          ...baseRun,
          status: 'SKIPPED',
          finishedAt: new Date(),
          output: { idempotencyKey, actionType: input.actionType, module: input.module || null, reason: 'module_disabled' },
        },
      });
      logger.info('[AutomationOrchestrator] Side effect skipped because module is disabled', {
        tenantId: input.tenantId,
        module: input.module,
        idempotencyKey,
      });
      return { executed: false, skippedReason: 'module_disabled' };
    }

    const existingKey = await automationIdempotencyService.getByKey(input.tenantId, idempotencyKey);
    const existingStatus = String(existingKey?.status || '').toUpperCase();
    if (existingStatus === 'COMPLETED' || existingStatus === 'STARTED' || existingStatus === 'PROCESSING') {
      const reason = existingStatus === 'COMPLETED' ? 'duplicate' : 'in_progress';
      await db.salesAutomationRun.create({
        data: {
          ...baseRun,
          status: 'SKIPPED',
          finishedAt: new Date(),
          output: { idempotencyKey, actionType: input.actionType, module: input.module || null, reason },
        },
      });
      return { executed: false, skippedReason: reason };
    }

    const run = await db.salesAutomationRun.create({
      data: {
        ...baseRun,
        status: 'RUNNING',
        startedAt: new Date(),
        output: { idempotencyKey, actionType: input.actionType, module: input.module || null, sideEffects: [] },
      },
    });

    try {
      const result = await automationIdempotencyService.runOnce(
        input.tenantId,
        idempotencyKey,
        {
          eventName: input.eventName,
          entityType: input.entityType,
          entityId: input.entityId,
          actionType: input.actionType,
          result: { module: input.module || null },
        },
        fn,
      );

      if (!result.executed) {
        const reason = result.skippedReason || 'duplicate';
        await db.salesAutomationRun.update({
          where: { id: run.id },
          data: {
            status: 'SKIPPED',
            finishedAt: new Date(),
            output: { idempotencyKey, actionType: input.actionType, module: input.module || null, reason },
          },
        });
        return { executed: false, skippedReason: reason };
      }

      await db.salesAutomationRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          output: {
            idempotencyKey,
            actionType: input.actionType,
            module: input.module || null,
            sideEffects: [input.actionType],
            result: compactResult(result.result),
          },
        },
      });
      activityLogger.log({
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: 'CREATE',
        module: 'automation',
        description: `Automation side effect completed: ${input.actionType}`,
        metadata: { idempotencyKey, eventName: input.eventName, module: input.module || null },
      });
      return { executed: true, result: result.result };
    } catch (error) {
      await db.salesAutomationRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: errorMessage(error),
          output: { idempotencyKey, actionType: input.actionType, module: input.module || null, sideEffects: [], error: errorMessage(error) },
        },
      }).catch((updateError: any) => logger.warn('[AutomationOrchestrator] Failed to log failed run', { idempotencyKey, updateError }));
      throw error;
    }
  }
}

export const automationOrchestratorService = new AutomationOrchestratorService();
