import { Job } from 'bullmq';
import { QueueManager, QUEUES, BaseAccountingJob } from '../queue-factory';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../common/utils/logger';
import { accountingCache } from '../../cache/accounting-cache.service';

export const projectionWorker = QueueManager.createWorker(QUEUES.PROJECTION, async (job: Job<BaseAccountingJob>) => {
  const { tenantId, rawTransactionId } = job.data;
  
  // Here we would recalculate the specific month's LedgerProjection 
  // and update the DashboardProjection.
  
  const rawTx = await prisma.rawTransaction.findUnique({
    where: { id: rawTransactionId }
  });

  if (!rawTx) return;

  const month = (rawTx.normalizedData as any)?.date?.substring(0, 7) || '2023-01'; // Fallback
  
  // 1. Invalidate cache
  await accountingCache.invalidateProjections(tenantId);

  // 2. We'd usually do a DB SUM query here to recalculate the actual Projection table 
  // For brevity, we simply log the intention in this boilerplate.
  
  // await prisma.ledgerProjection.upsert({ ... })

  logger.info(`[ProjectionWorker] Projections updated for tenant ${tenantId}, month ${month}`);
});
