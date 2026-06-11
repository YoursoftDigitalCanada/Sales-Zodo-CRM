import { Job } from 'bullmq';
import { QueueManager, QUEUES, BaseAccountingJob, postingQueue } from '../queue-factory';
import { eventStoreService } from '../../event-store/event-store.service';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../common/utils/logger';

export const validationWorker = QueueManager.createWorker(QUEUES.VALIDATION, async (job: Job<BaseAccountingJob>) => {
  const { tenantId, rawTransactionId, version } = job.data;
  
  const rawTx = await prisma.rawTransaction.findUnique({
    where: { id: rawTransactionId }
  });

  if (!rawTx) return;

  // 1. Validation Logic
  const validationErrors = [];
  const warnings: string[] = [];

  if (rawTx.duplicateScore > 90) {
    validationErrors.push('HIGH_DUPLICATE_RISK');
  }

  if (!rawTx.aiCategory && !rawTx.transferScore) {
    validationErrors.push('MISSING_CATEGORY');
  }

  // Determine if it needs human review
  const requiresReview = validationErrors.length > 0;

  await prisma.rawTransaction.update({
    where: { id: rawTransactionId },
    data: {
      requiresReview,
      validationStatus: { errors: validationErrors, warnings },
      validationVersion: version.toString()
    }
  });

  await eventStoreService.appendEvent({
    tenantId,
    aggregateId: rawTransactionId,
    aggregateType: 'TRANSACTION',
    eventType: 'TransactionValidated',
    payload: { requiresReview, errors: validationErrors, warnings, version },
  });

  if (!requiresReview) {
    await postingQueue.add('post-ledger', {
      ...job.data,
      idempotencyKey: `posting-${rawTransactionId}-v${version}`
    });
  }

  logger.info(`[ValidationWorker] Processed ${rawTransactionId} (Needs Review: ${requiresReview})`);
});
