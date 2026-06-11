import { Job } from 'bullmq';
import { QueueManager, QUEUES, BaseAccountingJob, aiQueue, validationQueue } from '../queue-factory';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../common/utils/logger';
import { eventStoreService } from '../../event-store/event-store.service';

// --- Context Builder Worker ---
export const contextBuilderWorker = QueueManager.createWorker('context-builder', async (job: Job<BaseAccountingJob>) => {
  const { tenantId, rawTransactionId, version } = job.data;
  
  const rawTx = await prisma.rawTransaction.findUnique({
    where: { id: rawTransactionId }
  });

  if (!rawTx) return;

  // Fetch past 10 transactions for context
  const pastTransactions = await prisma.rawTransaction.findMany({
    where: { tenantId, status: 'POSTED' },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  // If we already resolved the category cleanly, skip AI
  if (rawTx.aiCategory) {
    await validationQueue.add('validate', job.data);
    return;
  }

  // Otherwise, enqueue to AI Worker
  await aiQueue.add('ask-ai', {
    ...job.data,
    context: pastTransactions.map((tx: any) => tx.normalizedData)
  });

  logger.info(`[ContextBuilderWorker] Built context for ${rawTransactionId}`);
});

// --- AI Brain Worker ---
export const aiWorker = QueueManager.createWorker(QUEUES.AI_BRAIN, async (job: Job<BaseAccountingJob & { context: any[] }>) => {
  const { tenantId, rawTransactionId, version, context } = job.data;
  
  const rawTx = await prisma.rawTransaction.findUnique({
    where: { id: rawTransactionId }
  });

  if (!rawTx) return;

  // Call OpenAI (mocked)
  const aiCategory = 'OFFICE_SUPPLIES';
  const aiReason = 'Categorized based on similar past transactions.';

  await prisma.rawTransaction.update({
    where: { id: rawTransactionId },
    data: { aiCategory, aiReason }
  });

  await eventStoreService.appendEvent({
    tenantId,
    aggregateId: rawTransactionId,
    aggregateType: 'TRANSACTION',
    eventType: 'AiCategorizationCompleted',
    payload: { aiCategory, aiReason, version },
  });

  await validationQueue.add('validate', {
    tenantId,
    sessionId: job.data.sessionId,
    rawTransactionId,
    version,
    idempotencyKey: `validation-${rawTransactionId}-v${version}`
  });

  logger.info(`[AiWorker] Categorized ${rawTransactionId} as ${aiCategory}`);
});
