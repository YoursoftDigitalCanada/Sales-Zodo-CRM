import { Job } from 'bullmq';
import { QueueManager, QUEUES, BaseAccountingJob, transferQueue } from '../queue-factory';
import { eventStoreService } from '../../event-store/event-store.service';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../common/utils/logger';

export const duplicateWorker = QueueManager.createWorker(QUEUES.DUPLICATE_INTELLIGENCE, async (job: Job<BaseAccountingJob>) => {
  const { tenantId, rawTransactionId, version } = job.data;
  
  const rawTx = await prisma.rawTransaction.findUnique({
    where: { id: rawTransactionId }
  });

  if (!rawTx) return;

  const txDate = (rawTx.normalizedData as any)?.date;
  const amount = (rawTx.normalizedData as any)?.amount;
  
  if (!txDate || !amount) {
    await transferQueue.add('score-transfer', job.data);
    return;
  }

  // Find exact duplicates (same hash or same amount+date+merchant)
  const exactDuplicates = await prisma.rawTransaction.findMany({
    where: {
      tenantId,
      id: { not: rawTransactionId },
      hash: rawTx.hash,
    }
  });

  let duplicateScore = 0;
  let duplicateReason = null;
  let duplicateOfId = null;

  if (exactDuplicates.length > 0) {
    duplicateScore = 100;
    duplicateReason = 'Exact Hash Match';
    duplicateOfId = exactDuplicates[0].id;
  } else {
    // Fuzzy matching
    const dateObj = new Date(txDate);
    const startDate = new Date(dateObj); startDate.setDate(startDate.getDate() - 2);
    const endDate = new Date(dateObj); endDate.setDate(endDate.getDate() + 2);

    const fuzzyDuplicates = await prisma.rawTransaction.findMany({
      where: {
        tenantId,
        id: { not: rawTransactionId },
        status: { in: ['IMPORTED', 'POSTED'] }
      }
    });

    const possible = fuzzyDuplicates.find((dup) => {
      const dupData = dup.normalizedData as any;
      if (!dupData?.date || !dupData?.amount) return false;
      const dupDate = new Date(dupData.date);
      return dupData.amount === amount && dupDate >= startDate && dupDate <= endDate;
    });

    if (possible) {
      duplicateScore = 80;
      duplicateReason = 'Same Amount within 48 hours';
      duplicateOfId = possible.id;
    }
  }

  await prisma.rawTransaction.update({
    where: { id: rawTransactionId },
    data: {
      duplicateScore,
      duplicateReason,
      duplicateOfId,
      duplicateVersion: version
    }
  });

  await eventStoreService.appendEvent({
    tenantId,
    aggregateId: rawTransactionId,
    aggregateType: 'TRANSACTION',
    eventType: 'DuplicateScored',
    payload: { duplicateScore, duplicateReason, duplicateOfId, version },
  });

  await transferQueue.add('score-transfer', {
    ...job.data,
    idempotencyKey: `transfer-${rawTransactionId}-v${version}`
  });

  logger.info(`[DuplicateWorker] Processed ${rawTransactionId} (Score: ${duplicateScore})`);
});
