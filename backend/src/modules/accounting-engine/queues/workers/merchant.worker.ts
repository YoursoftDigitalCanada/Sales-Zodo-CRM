import { Job } from 'bullmq';
import { QueueManager, QUEUES, BaseAccountingJob, duplicateQueue } from '../queue-factory';
import { eventStoreService } from '../../event-store/event-store.service';
import { merchantIntelligenceService as merchantService } from '../../merchant-intelligence/merchant.service';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../common/utils/logger';
import { accountingCache } from '../../cache/accounting-cache.service';

export const merchantWorker = QueueManager.createWorker(QUEUES.MERCHANT_INTELLIGENCE, async (job: Job<BaseAccountingJob>) => {
  const { tenantId, rawTransactionId, version } = job.data;
  
  // 1. Fetch the RawTransaction
  const rawTx = await prisma.rawTransaction.findUnique({
    where: { id: rawTransactionId }
  });

  if (!rawTx) throw new Error(`RawTx ${rawTransactionId} not found`);

  const rawDescription = (rawTx.normalizedData as any)?.description || '';

  // 2. Try Exact Cache Hit first
  let resolvedMerchant = await accountingCache.getMerchantRule(tenantId, rawDescription);

  if (!resolvedMerchant) {
    // 3. Fallback to Heavy DB Matching
    resolvedMerchant = await merchantService.resolveMerchant(tenantId, rawDescription);
    if (resolvedMerchant) {
      await accountingCache.setMerchantRule(tenantId, rawDescription, resolvedMerchant);
    }
  }

  // 4. Update the DB
  const updateData: any = {
    merchantVersion: version.toString()
  };

  if (resolvedMerchant) {
    updateData.aiVendor = resolvedMerchant.canonicalName;
    updateData.merchantConfidence = resolvedMerchant.confidence;
    updateData.aiCategory = resolvedMerchant.defaultCategoryId;
  }

  await prisma.rawTransaction.update({
    where: { id: rawTransactionId },
    data: updateData
  });

  // 5. Append Event Sourcing Event
  await eventStoreService.appendEvent({
    tenantId,
    aggregateId: rawTransactionId,
    aggregateType: 'TRANSACTION',
    eventType: 'MerchantResolved',
    payload: { resolvedMerchant, version },
  });

  // 6. Enqueue next step
  await duplicateQueue.add('score-duplicate', {
    ...job.data,
    idempotencyKey: `duplicate-${rawTransactionId}-v${version}`
  });

  logger.info(`[MerchantWorker] Processed ${rawTransactionId} -> ${resolvedMerchant?.canonicalName || 'Unknown'}`);
});
