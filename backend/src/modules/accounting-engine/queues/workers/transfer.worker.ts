import { Job } from 'bullmq';
import { QueueManager, QUEUES, BaseAccountingJob, validationQueue } from '../queue-factory';
import { eventStoreService } from '../../event-store/event-store.service';
import { transferMatchingService } from '../../transfer-intelligence/transfer-matching.service';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../common/utils/logger';

export const transferWorker = QueueManager.createWorker(QUEUES.TRANSFER_INTELLIGENCE, async (job: Job<BaseAccountingJob>) => {
  const { tenantId, rawTransactionId, version } = job.data;
  
  const rawTx = await prisma.rawTransaction.findUnique({
    where: { id: rawTransactionId }
  });

  if (!rawTx) return;

  const score = 0;
  const isTransfer = false;

  // Next step depends on whether we need AI or just jump to validation
  // For now, jump straight to Validation Worker unless OpenAI is active
  await validationQueue.add('validate', {
    ...job.data,
    idempotencyKey: `validation-${rawTransactionId}-v${version}`
  });

  logger.info(`[TransferWorker] Processed ${rawTransactionId} (Score: ${score})`);
});
