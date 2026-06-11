import { Job } from 'bullmq';
import { QueueManager, QUEUES, BaseAccountingJob, merchantQueue } from '../queue-factory';
import { eventStoreService } from '../../event-store/event-store.service';
import { csvParserService } from '../../api/csv-parser.service';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../common/utils/logger';
import { createHash } from 'crypto';

interface ImportSessionJob {
  tenantId: string;
  sessionId: string;
  version: number;
  idempotencyKey: string;
}

export const importWorker = QueueManager.createWorker(QUEUES.IMPORT, async (job: Job<ImportSessionJob>) => {
  const { tenantId, sessionId, version, idempotencyKey } = job.data;
  
  logger.info(`[ImportWorker] Starting import for session ${sessionId} (Tenant: ${tenantId})`);

  // 1. Fetch Session & Files
  const session = await prisma.importSession.findUnique({
    where: { id: sessionId },
    include: { files: true }
  });

  if (!session || session.files.length === 0) {
    throw new Error(`Session ${sessionId} not found or has no files`);
  }

  // 2. Process Files
  for (const file of session.files) {
    // Note: In reality, we'd fetch the file content from S3 here. 
    // For this demonstration, we'll assume the parser can be passed dummy content.
    const mockCsvContent = `Date,Description,Amount\n2023-10-01,Starbucks,-5.50`;
    
    const parsed = csvParserService.parse(mockCsvContent, file.originalName);
    
    let processedCount = 0;

    for (const normalizedTx of parsed.normalized) {
      // Create deterministic hash for the raw row
      const hash = createHash('sha256')
        .update(`${tenantId}-${normalizedTx.date}-${normalizedTx.amount}-${normalizedTx.description}`)
        .digest('hex');

      // 3. Create RawTransaction in Postgres
      const rawTx = await prisma.rawTransaction.create({
        data: {
          tenantId,
          sessionId,
          uploadedFileId: file.id,
          originalRow: normalizedTx.originalRow,
          normalizedData: normalizedTx as any,
          hash,
          status: 'IMPORTED'
        }
      });

      // 4. Append Event Sourcing Event
      await eventStoreService.appendEvent({
        tenantId,
        aggregateId: rawTx.id,
        aggregateType: 'TRANSACTION',
        eventType: 'TransactionImported',
        payload: { hash, data: normalizedTx },
        causationId: sessionId,
      });

      // 5. Fire next event: Merchant Intelligence Worker
      await merchantQueue.add('resolve-merchant', {
        tenantId,
        sessionId,
        rawTransactionId: rawTx.id,
        version: 1,
        idempotencyKey: `merchant-${rawTx.id}-v1`
      } as BaseAccountingJob);

      processedCount++;
    }

    await prisma.uploadedFile.update({
      where: { id: file.id },
      data: { status: 'PROCESSED', processedCount }
    });
  }

  await prisma.importSession.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED' }
  });

  logger.info(`[ImportWorker] Completed session ${sessionId}`);
});
