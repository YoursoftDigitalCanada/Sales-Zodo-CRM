import { Job } from 'bullmq';
import { QueueManager, QUEUES, BaseAccountingJob, projectionQueue } from '../queue-factory';
import { eventStoreService } from '../../event-store/event-store.service';
import { deterministicAccountingEngine as deterministicAccountingService } from '../../deterministic-engine/deterministic-accounting.service';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../common/utils/logger';

export const postingWorker = QueueManager.createWorker(QUEUES.POSTING, async (job: Job<BaseAccountingJob>) => {
  const { tenantId, rawTransactionId, version } = job.data;
  
  const rawTx = await prisma.rawTransaction.findUnique({
    where: { id: rawTransactionId }
  });

  if (!rawTx || rawTx.status === 'POSTED') return;

  // Delegate double-entry creation to the deterministic engine
  const transactionId = await deterministicAccountingService.processAndPost(rawTransactionId, tenantId) ? rawTransactionId : null;

  await prisma.rawTransaction.update({
    where: { id: rawTransactionId },
    data: { status: 'POSTED', transactionId }
  });

  await eventStoreService.appendEvent({
    tenantId,
    aggregateId: rawTransactionId,
    aggregateType: 'TRANSACTION',
    eventType: 'TransactionPostedToLedger',
    payload: { transactionId, version },
  });

  // Kick off asynchronous projections
  await projectionQueue.add('update-projections', {
    ...job.data,
    idempotencyKey: `projection-${rawTransactionId}-v${version}`
  });

  logger.info(`[PostingWorker] Posted ${rawTransactionId} to ledger (TxID: ${transactionId})`);
});
